import { marketId, contractId } from './near';

const DELIMETER = '||';
const SERIES_DELIMETER = ':';
const HELPER_URL = 'https://helper.nearapi.org/v1/batch/'

// TODO cache series and tokens already seen
const seriesCache = {};
const tokenCache = {};

const id2series = (token_id) => token_id.split(SERIES_DELIMETER)[0]
export const singleBatchCall = async (view, method = 'GET') => {
	let url = HELPER_URL;
	let body
	if (method === 'POST') {
		body = JSON.stringify([view])
		url += JSON.stringify({})
	} else {
		url += JSON.stringify([view])
	}
	return (await fetch(url, {
		headers: {
			'near-network': 'testnet'
		},
		method,
		body,
	}).then((res) => res.json()))[0];
}

export const loadMarket = () => async ({ getState, update, dispatch }) => {
	const { contractAccount } = getState()
	const numSales = await contractAccount.viewFunction(marketId, 'get_supply_by_nft_contract_id', {
		nft_contract_id: contractId
	})
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
	})

	const token_ids = sales.filter(({ is_series }) => !is_series).map(({ token_id }) => token_id)
	const series_names = sales.map(({ token_id }) => id2series(token_id))

	const tokens = await singleBatchCall({
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
	}, 'POST');

	const series = await singleBatchCall({
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
	}, 'POST')

	const seriesClaimed = await singleBatchCall({
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

	series.forEach((s, i) => s.claimed = seriesClaimed[i])

	sales.forEach((sale) => {
		sale.is_sale = true
		const { is_series, token_id } = sale
		if (is_series) {
			sale.series = series.find(({ series_name }) => series_name === token_id)
			sale.id = token_id
			sale.src = sale.series.src
		} else {
			const series_name = sale.series_name = id2series(token_id)
			sale.token = tokens.find((t) => t.token_id === token_id)
			sale.series = series.find((s) => s.series_name === series_name)
			sale.id = token_id
			sale.src = sale.series.src
		}
	})

	update('views', { market: sales });
}

export const loadMint = (series_name) => async ({ getState, update, dispatch }) => {
	const { contractAccount } = getState()
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
	sale.id = series_name
	sale.src = sale.series.src

	update('views', { mint: sale });
}

export const loadSeries = () => async ({ getState, update, dispatch }) => {
	const { contractAccount } = getState()
	const numSeries = await contractAccount.viewFunction(contractId, 'series_supply', {})
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
	}, 'POST')

	const seriesClaimed = await singleBatchCall({
		contract: contractId,
		method: 'series_range',
		args: {},
		batch: {
			from_index: '0',
			limit: numSeries,
			step: '50', // divides batch above
			flatten: [],
		},
	}, 'POST')

	series.forEach((s, i) => {
		s.claimed = seriesClaimed[i]
		addCompatFields(s)
	})

	update('views', { series });
}


///  TODO upgrade the rest of the views to use api-helper
export const loadCollection = (owner_id) => async ({ getState, update, dispatch }) => {

}

//TODO all should get codeId etc...
const addCompatFields = (tokenOrSeries) => {
	if (tokenOrSeries.series) {
		tokenOrSeries.id = tokenOrSeries.token_id;
		tokenOrSeries.src = tokenOrSeries.series.src;
		tokenOrSeries.is_token = true
	} else {
		const {series_name, src} = tokenOrSeries;
		tokenOrSeries.id = series_name;
		tokenOrSeries.src = src;
		tokenOrSeries.is_series = true
	}
};
export const getToken = (token_id) => async ({ getState, update }) => {
	const { contractAccount } = getState();
	const token = await contractAccount.viewFunction(contractId, 'nft_token', {
		token_id,
	});
	token.is_token = true
	token.series = await loadSeriesName(contractAccount, token.series_args.series_name);
	token.sales = [await contractAccount.viewFunction(marketId, 'get_sale', {
		nft_contract_token: contractId + DELIMETER + token_id
	})];
	addCompatFields(token);
	update('views', { token });
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

export const loadEverythingForOwner = (account_id) => async ({ update, getState }) => {
	const { contractAccount, account } = getState();
	const tokensPerOwner = await contractAccount.viewFunction(contractId, 'nft_tokens_for_owner', {
		account_id,
		from_index: '0',
		limit: '100',
	});
	await Promise.all(tokensPerOwner.map(async (token) => {
		token.is_token = true
		token.series = await loadSeriesName(contractAccount, token.series_args.series_name);
		// alias for compat with tokens
		addCompatFields(token);
	}));
	const seriesPerOwner = await contractAccount.viewFunction(contractId, 'series_per_owner', {
		account_id,
		from_index: '0',
		limit: '100'
	});
	await Promise.all(seriesPerOwner.map(async (series) => {
		series.is_series = true
		series.tokens = await contractAccount.viewFunction(contractId, 'nft_tokens_for_series', {
			series_name: series.series_name,
			from_index: '0',
			limit: '100'
		});
		series.unsoldTokens = tokensPerOwner.filter(({ num_transfers, series_args: { series_name } }) => 
			num_transfers === '0' && series_name === series.series_name
		);
		if (account) {
			series.firstSales = (await contractAccount.viewFunction(marketId, 'get_sales_by_owner_id', {
				account_id: account.accountId,
				from_index: '0',
				limit: '100'
			})).filter(({ token_id, token_type }) => token_type === series.series_name &&
                series.unsoldTokens.some(({ token_id: unsold_id }) => token_id === unsold_id)
			);
		}
		addCompatFields(series);
	}));
	update('views', {
		seriesPerOwner,
		tokensPerOwner
	});
	return {
		seriesPerOwner,
		tokensPerOwner
	};
};



export const loadSeriesName = async (contractAccount, series_name) => {
	let series = seriesCache[series_name];
	if (!series) {
		series = seriesCache[series_name] = await contractAccount.viewFunction(contractId, 'series_data', { series_name });
	}
	return series;
};
