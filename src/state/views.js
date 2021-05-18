import { marketId, contractId } from './near';

export const getTokensForSeries = (series_name) => async ({ getState, update }) => {
    const { contractAccount } = getState()
    return await contractAccount.viewFunction(contractId, 'nft_tokens_for_series', {
        series_name,
        from_index: '0',
        limit: '100',
    })   
}

export const loadEverythingForOwner = (account_id) => async ({ update, getState }) => {
    const { contractAccount, account } = getState()
    const tokensPerOwner = await contractAccount.viewFunction(contractId, 'nft_tokens_for_owner', {
        account_id,
        from_index: '0',
        limit: '100',
    })
    await Promise.all(tokensPerOwner.map(async (token) => {
        token.series = await loadSeries(contractAccount, token.series_args.name)
        // alias for compat with tokens
        token.codeId = token.token_id
        token.codeSrc = token.series.src
    }))
    const seriesPerOwner = await contractAccount.viewFunction(contractId, 'get_series_per_owner', {
        account_id,
        from_index: '0',
        limit: '100'
    });
    await Promise.all(seriesPerOwner.map(async (series) => {
        series.tokens = await contractAccount.viewFunction(contractId, 'nft_tokens_for_series', {
            series_name: series.name,
            from_index: '0',
            limit: '100'
        });
        series.unsoldTokens = tokensPerOwner.filter(({ num_transfers, series_args: { name } }) => 
            num_transfers === '0' && name === series.name
        )
        if (account) {
            series.firstSales = (await contractAccount.viewFunction(marketId, 'get_sales_by_owner_id', {
                account_id: account.accountId,
                from_index: '0',
                limit: '100'
            })).filter(({ token_id, token_type }) => token_type === series.name &&
                series.unsoldTokens.some(({ token_id: unsold_id }) => token_id === unsold_id)
            );
        }
        
        // alias for compat with tokens
        series.codeId = series.name
        series.codeSrc = series.src
    }))
    update('views', {
        seriesPerOwner,
        tokensPerOwner: tokensPerOwner.filter(({ num_transfers }) => num_transfers !== '0')
    })
}

export const loadEverything = () => async ({ update, dispatch }) => {
    const { salesBySeries } = await dispatch(loadSales())
    const { tokens } = await dispatch(loadTokens())
    const everything = [...tokens, ...salesBySeries]
    everything.sort((a, b) => parseInt(b.issued_at, 10) - parseInt(a.issued_at, 10))
    update('views', { everything })
}

export const loadTokens = () => async ({ getState, update }) => {
    const { contractAccount } = getState()
    let tokens = await contractAccount.viewFunction(contractId, 'nft_tokens', {
        from_index: '0',
        limit: '100'
    });
    tokens = tokens.filter(({ series_args }) => series_args.mint.length)
    await Promise.all(tokens.map(async (token) => {
        token.series = await loadSeries(contractAccount, token.series_args.name)
        // alias for compat with tokens
        token.codeId = token.token_id
        token.codeSrc = token.series.src
    }))
    update('views', { tokens })
    return { tokens }
}

export const loadSales = () => async ({ getState, update }) => {
    const { contractAccount } = getState()
    const sales = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_contract_id', {
        nft_contract_id: contractId,
        from_index: '0',
        limit: '100'
    });
    const seriesNames = [...new Set(sales.map(({ token_type: name }) => name))]
    const salesBySeries = []
    await Promise.all(seriesNames.map(async (name) => {
        const series = await loadSeries(contractAccount, name)
        series.sales = sales.filter(({ token_type }) => token_type === name)
        // alias for compat with tokens
        series.codeId = name
        series.codeSrc = series.src
        salesBySeries.push(series);
    }))
    update('views', { sales, salesBySeries })
    return { sales, salesBySeries }
}

const seriesCache = {};
export const loadSeriesRange = () => async ({ getState, update }) => {
    const { contractAccount } = getState()
    const series = await contractAccount.viewFunction(contractId, 'get_series_range', {
        from_index: '0',
        limit: '100'
    });

    await Promise.all(series.map(async (series) => {
        console.log(series)
        series.sales = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_token_type', {
            token_type: series.name,
            from_index: '0',
            limit: '100'
        });
        series.codeId = series.name
        series.codeSrc = series.src
        seriesCache[series.name] = series
    }))
    update('views', { series: Object.values(seriesCache) })
    return { series: Object.values(seriesCache) }
}

export const loadSeries = async (contractAccount, name) => {
    let series = seriesCache[name]
    if (!series) {
        series = seriesCache[name] = await contractAccount.viewFunction(contractId, 'get_series', { name })
    }
    series.name = name
    return series
}
