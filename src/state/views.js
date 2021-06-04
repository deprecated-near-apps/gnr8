import { marketId, contractId, networkId } from './near';
import { ORIGINAL_PATH } from '../utils/history'

const DELIMETER = '||';
const SERIES_DELIMETER = ':';
const HELPER_URL = 'https://helper.nearapi.org/';
const BATCH_URL = HELPER_URL + 'v1/batch/';
const SHARE_URL = HELPER_URL + 'v1/share/';

// TODO cache series and tokens already seen
const seriesCache = {};
// const tokenCache = {};
const useSeriesCache = false;

/// helpers

const id2series = (token_id) => token_id.split(SERIES_DELIMETER)[0];

const singleBatchCall = async (view, method = 'GET', first = false) => {
	let url = BATCH_URL;
	let body;
	if (method === 'POST') {
		body = JSON.stringify([view]);
		url += JSON.stringify({});
	} else {
		url += JSON.stringify([view]);
	}
	const headers = {
		'near-network': networkId,
	}
	if (first) {
		headers['max-age'] = '0'
	}
	return (await fetch(url, {
		headers: new Headers(headers),
		method,
		body,
	}).then((res) => res.json()))[0];
};

/// sharing urls to nfts

export const getShareUrl = async ({
	nft,
	title = 'GNR8 Generative NFTs',
	description = 'Check out this generative NFT on GNR8!'
}) => {
	return (await fetch(SHARE_URL + JSON.stringify({
		title,
		description,
		nft,
		redirect: encodeURIComponent(window.origin + ORIGINAL_PATH + '/#/token/' + nft.tokenId)
	})).then((res) => res.json())).encodedUrl;
};

/// route views

export const loadMarket = () => async ({ getState, update, dispatch }) => {
	const { contractAccount } = getState();
	const numSales = await contractAccount.viewFunction(marketId, 'get_supply_by_nft_contract_id', {
		nft_contract_id: contractId
	});
	const sales = await singleBatchCall({
		contract: marketId,
		method: 'get_sales_by_nft_contract_id',
		args: {
			nft_contract_id: contractId,
		}, 
		batch: {
			from_index: '0',
			limit: numSales,
			step: '50',
			flatten: []
		},
		sort: {
			path: 'created_at',
		}
	}, 'GET', true);

	const token_ids = sales.filter(({ is_series }) => !is_series).map(({ token_id }) => token_id);
	const cachedSeriesNames = useSeriesCache ? Object.keys(seriesCache) : [];
	const series_names = [...new Set(sales.map(({ token_id }) => id2series(token_id)))].filter((n) => !cachedSeriesNames.includes(n));
	
	const [tokens, series, seriesClaimed] = await Promise.all([
		singleBatchCall({
			contract: contractId,
			method: 'nft_tokens_batch',
			args: {
				token_ids
			},
			batch: {
				from_index: '0',
				limit: numSales,
				step: '50', // divides batch above
				flatten: [],
			},
		}, 'POST'),
		singleBatchCall({
			contract: contractId,
			method: 'series_batch',
			args: {
				series_names
			},
			batch: {
				from_index: '0',
				limit: numSales,
				step: '50', // divides batch above
				flatten: [],
			},
		}, 'POST'),
		singleBatchCall({
			contract: contractId,
			method: 'nft_supply_for_series_batch',
			args: {
				series_names
			},
			batch: {
				from_index: '0',
				limit: numSales,
				step: '50', // divides batch above
				flatten: [],
			},
		}, 'POST')
	]);

	series.forEach((s, i) => {
		s.claimed = seriesClaimed[i];
		seriesCache[s.series_name] = s;
	});
	// add cached series we removed from series_names arg to batch calls
	series.push(...Object.values(seriesCache));

	sales.forEach((sale) => {
		sale.is_sale = true;
		const { is_series, token_id } = sale;
		if (is_series) {
			sale.series = series.find(({ series_name }) => series_name === token_id);
			sale.id = token_id;
			sale.src = sale.series.src;
		} else {
			const series_name = sale.series_name = id2series(token_id);
			sale.token = tokens.find((t) => t.token_id === token_id);
			sale.series = series.find((s) => s.series_name === series_name);
			sale.id = token_id;
			sale.src = sale.series.src;
		}
	});

	update('views', { market: sales });
};

export const loadGallery = () => async ({ getState, update, dispatch }) => {
	const { contractAccount } = getState();
	const numTokens = await contractAccount.viewFunction(contractId, 'nft_total_supply');
	const tokens = await singleBatchCall({
		contract: contractId,
		method: 'nft_tokens',
		args: {}, 
		batch: {
			from_index: '0',
			limit: numTokens,
			step: '50',
			flatten: []
		},
		sort: {
			path: 'metadata.issued_at',
		}
	});

	const cachedSeriesNames = useSeriesCache ? Object.keys(seriesCache) : [];
	const series_names = [...new Set(tokens.map(({ token_id }) => id2series(token_id)))].filter((n) => !cachedSeriesNames.includes(n));
	
	const [series, seriesClaimed] = await Promise.all([
		singleBatchCall({
			contract: contractId,
			method: 'series_batch',
			args: {
				series_names
			},
			batch: {
				from_index: '0',
				limit: series_names.length.toString(),
				step: '50', // divides batch above
				flatten: [],
			},
		}, 'POST'),
		singleBatchCall({
			contract: contractId,
			method: 'nft_supply_for_series_batch',
			args: {
				series_names
			},
			batch: {
				from_index: '0',
				limit: series_names.length.toString(),
				step: '50', // divides batch above
				flatten: [],
			},
		}, 'POST')
	]);

	series.forEach((s, i) => {
		s.claimed = seriesClaimed[i];
		seriesCache[s.series_name] = s;
	});
	// add cached series we removed from series_names arg to batch calls
	series.push(...Object.values(seriesCache));

	tokens.forEach((token) => {
		token.is_token = true;
		const { token_id } = token;
		const series_name = token.series_name = id2series(token_id);
		token.series = series.find((s) => s.series_name === series_name);
		token.id = token_id;
		token.src = token.series.src;
	});

	update('views', { gallery: tokens });
};

export const loadMint = (series_name) => async ({ getState, update, dispatch }) => {
	const { contractAccount } = getState();
	const sale = await contractAccount.viewFunction(marketId, 'get_sale', {
		nft_contract_token: contractId + DELIMETER + series_name
	});
	sale.series = await contractAccount.viewFunction(contractId, 'series_data', {
		series_name
	});
	sale.claimed = await contractAccount.viewFunction(contractId, 'nft_supply_for_series', {
		series_name
	});
	sale.is_sale = true;
	sale.id = series_name;
	sale.src = sale.series.src;

	update('views', { mint: sale });
};

export const loadSeries = () => async ({ getState, update, dispatch }) => {
	const { contractAccount } = getState();
	const numSeries = await contractAccount.viewFunction(contractId, 'series_supply', {});
	const series = await singleBatchCall({
		contract: contractId,
		method: 'series_range',
		args: {},
		batch: {
			from_index: '0',
			limit: numSeries,
			step: '50', // divides batch above
			flatten: [],
		},
		sort: {
			path: 'created_at',
		}
	}, 'POST');

	const series_names = series.map((s) => s.series_name);
	const sales_names = series_names.map((series_name) => contractId + DELIMETER + series_name);

	const [sales, seriesClaimed] = await Promise.all([
		singleBatchCall({
			contract: marketId,
			method: 'get_sales_batch',
			args: {
				sales_names
			},
			batch: {
				from_index: '0',
				limit: sales_names.length.toString(),
				step: '50', // divides batch above
				flatten: [],
			},
		}, 'POST'),
		singleBatchCall({
			contract: contractId,
			method: 'nft_supply_for_series_batch',
			args: {
				series_names
			},
			batch: {
				from_index: '0',
				limit: series_names.length.toString(),
				step: '50', // divides batch above
				flatten: [],
			},
		}, 'POST')
	]);

	series.forEach((s, i) => {
		s.claimed = seriesClaimed[i];
		if (sales[i]) {
			s.sale = sales[i];
		}
		seriesCache[s.series_name] = s;
		addCompatFields(s);
	});

	update('views', { series });
};

export const loadCollection = (account_id) => async ({ getState, update, dispatch }) => {
	const { contractAccount } = getState();
	
	const numTokens = await contractAccount.viewFunction(contractId, 'nft_supply_for_owner', {
		account_id
	});

	const numSeries = await contractAccount.viewFunction(contractId, 'series_supply_for_owner', {
		account_id
	});

	const [tokens, series] = await Promise.all([
		singleBatchCall({
			contract: contractId,
			method: 'nft_tokens_for_owner',
			args: {
				account_id,
			}, 
			batch: {
				from_index: '0',
				limit: numTokens,
				step: '50',
				flatten: []
			},
			sort: {
				path: 'metadata.issued_at',
			}
		}, 'GET', true),
		singleBatchCall({
			contract: contractId,
			method: 'series_per_owner',
			args: {
				account_id,
			}, 
			batch: {
				from_index: '0',
				limit: numSeries,
				step: '50',
				flatten: []
			},
			sort: {
				path: 'created_at',
			}
		}, 'GET', true),
	]);

	// const cachedSeriesNames = useSeriesCache ? Object.keys(seriesCache) : [];
	const series_names = series.map(({ series_name }) => series_name);
	const token_series_names = tokens.map(({ token_id }) => id2series(token_id))
	const sales_names = tokens.map(({ token_id }) => contractId + DELIMETER + token_id)
		.concat(series_names.map((series_name) => contractId + DELIMETER + series_name));

	let [tokenSeries, sales, seriesClaimed] = await Promise.all([
		singleBatchCall({
			contract: contractId,
			method: 'series_batch',
			args: {
				series_names: token_series_names
			},
			batch: {
				from_index: '0',
				limit: token_series_names.length.toString(),
				step: '50', // divides batch above
				flatten: [],
			},
		}, 'POST'),
		singleBatchCall({
			contract: marketId,
			method: 'get_sales_batch',
			args: {
				sales_names
			},
			batch: {
				from_index: '0',
				limit: sales_names.length.toString(),
				step: '50', // divides batch above
				flatten: [],
			},
		}, 'POST'),
		singleBatchCall({
			contract: contractId,
			method: 'nft_supply_for_series_batch',
			args: {
				series_names
			},
			batch: {
				from_index: '0',
				limit: series_names.length.toString(),
				step: '50', // divides batch above
				flatten: [],
			},
		}, 'POST')
	]);

	sales = sales.filter((s) => !!s)

	tokens.forEach((t, i) => {
		const { token_id } = t
		t.sale = sales.find((s) => s.token_id === token_id)
		const series_name = t.series_name = id2series(token_id);
		t.series = tokenSeries.find((s) => s.series_name === series_name);
		addCompatFields(t)
	});

	series.forEach((s, i) => {
		s.claimed = seriesClaimed[i];
		s.sale = sales.find(({ token_id }) => s.series_name === token_id)
		addCompatFields(s)
	});
	// add cached series we removed from series_names arg to batch calls
	// series.push(...Object.values(seriesCache));

	const collection = [...tokens, ...series]
	collection.sort((a, b) => 
		parseInt(b?.metadata?.issued_at || b?.created_at || '0', 10) -
		parseInt(a?.metadata?.issued_at || a?.created_at || '0', 10)
	);

	update('views', { collection });

	return collection
};

//TODO all should get codeId etc...
const addCompatFields = (item) => {
	if (item.series) {
		item.id = item.token_id;
		item.src = item.series.src;
		item.is_token = true;
	} else {
		item.id = item.series_name;
		item.is_series = true;
	}
};





///  TODO upgrade the rest of the views to use api-helper






export const getToken = (token_id) => async ({ getState, update }) => {
	const { contractAccount } = getState();
	const token = await contractAccount.viewFunction(contractId, 'nft_token', {
		token_id,
	});
	if (!token) {
		return false
	}
	token.is_token = true;
	token.series = await loadSeriesName(contractAccount, token.series_args.series_name);
	token.sales = [await contractAccount.viewFunction(marketId, 'get_sale', {
		nft_contract_token: contractId + DELIMETER + token_id
	})];
	addCompatFields(token);
	update('views', { token });
	return token
};

export const getPackageRange = (from_index = '0', limit = '100') => async ({ getState, update }) => {
	const { contractAccount } = getState();
	const packages = await contractAccount.viewFunction(contractId, 'get_package_range', {
		from_index,
		limit,
	});
	update('views', { packages });
};

export const getTokensForSeries = (series_name) => async ({ getState, update }) => {
	const { contractAccount } = getState();
	return await contractAccount.viewFunction(contractId, 'nft_tokens_for_series', {
		series_name,
		from_index: '0',
		limit: '100',
	});   
};

export const loadSeriesName = async (contractAccount, series_name) => {
	let series = seriesCache[series_name];
	if (!series) {
		series = seriesCache[series_name] = await contractAccount.viewFunction(contractId, 'series_data', { series_name });
	}
	return series;
};
