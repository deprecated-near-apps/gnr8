import { marketId, contractId } from './near';

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
		token.series = await loadSeries(contractAccount, token.series_args.series_name);
		// alias for compat with tokens
		token.codeId = token.token_id;
		token.codeSrc = token.series.src;
	}));
	const seriesPerOwner = await contractAccount.viewFunction(contractId, 'series_per_owner', {
		account_id,
		from_index: '0',
		limit: '100'
	});
	await Promise.all(seriesPerOwner.map(async (series) => {
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
        
		// alias for compat with tokens
		series.codeId = series.series_name;
		series.codeSrc = series.src;
	}));
	update('views', {
		seriesPerOwner,
		tokensPerOwner: tokensPerOwner.filter(({ num_transfers }) => num_transfers !== '0')
	});
};

export const loadEverything = () => async ({ update, dispatch }) => {
	const { salesBySeries } = await dispatch(loadSales());
	const { tokens } = await dispatch(loadTokens());
	const everything = [...tokens, ...salesBySeries];
	everything.sort((a, b) => parseInt(b.issued_at, 10) - parseInt(a.issued_at, 10));
	update('views', { everything });
};

export const loadTokens = () => async ({ getState, update }) => {
	const { contractAccount } = getState();
	let tokens = await contractAccount.viewFunction(contractId, 'nft_tokens', {
		from_index: '0',
		limit: '100'
	});
	tokens = tokens.filter(({ series_args }) => series_args.mint.length);
	await Promise.all(tokens.map(async (token) => {
		token.series = await loadSeries(contractAccount, token.series_args.series_name);
		// alias for compat with tokens
		token.codeId = token.token_id;
		token.codeSrc = token.series.src;
	}));
	update('views', { tokens });
	return { tokens };
};

export const loadSales = () => async ({ getState, update }) => {
	const { contractAccount } = getState();
    
	const sales = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_contract_id', {
		nft_contract_id: contractId,
		from_index: '0',
		limit: '100'
	});
    
	const seriesNames = [...new Set(sales.map(({ token_id, token_type }) => {
		return token_type || token_id;
	} ))];

	const salesBySeries = await Promise.all(seriesNames.map(async (series_name) => {
		const series = await loadSeries(contractAccount, series_name);
		series.sales = sales.filter(({ token_id, token_type }) => token_type === series_name || token_id === series_name);
		series.claimed = parseInt(await contractAccount.viewFunction(contractId, 'nft_supply_for_series', { series_name }), 10);
		// alias for compat with tokens
        
		series.codeId = series_name;
		series.codeSrc = series.src;
		return series;
	}));
	update('views', { sales, salesBySeries });
	return { sales, salesBySeries };
};

const seriesCache = {};
export const loadSeriesRange = () => async ({ getState, update }) => {
	const { contractAccount } = getState();
	const series = await contractAccount.viewFunction(contractId, 'series_names', {
		from_index: '0',
		limit: '100'
	});

	await Promise.all(series.map(async (series) => {
		const { series_name } = series;
		series.sales = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_token_type', {
			token_type: series_name,
			from_index: '0',
			limit: '100'
		});

		series.claimed = parseInt(await contractAccount.viewFunction(contractId, 'nft_supply_for_series', { series_name }), 10);

		series.codeId = series_name;
		series.codeSrc = series.src;
		seriesCache[series_name] = series;
	}));
	update('views', { series: Object.values(seriesCache) });
	return { series: Object.values(seriesCache) };
};

export const loadSeries = async (contractAccount, series_name) => {
	let series = seriesCache[series_name];
	if (!series) {
		series = seriesCache[series_name] = await contractAccount.viewFunction(contractId, 'series_data', { series_name });
	}
	return series;
};
