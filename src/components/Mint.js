import React, { useEffect, useState } from 'react';
import { GAS, contractId, marketId, parseNearAmount } from '../state/near';
import { loadCodeFromSrc, getParams } from '../state/code';
import { loadSales, getTokensForSeries } from '../state/views';
import { hexToRgb } from '../utils/color';
import { Menu } from './Menu';

export const Mint = ({ app, path, views, update, dispatch, account }) => {

	const { mintMenu } = app;
	const { salesBySeries } = views

	const [state, setState] = useState({})

	useEffect(() => {
		dispatch(loadSales())
	}, []);

	useEffect(() => {
		if (!salesBySeries?.length) return
		const seriesName = path.matchAll(/\/mint\/(.+)/gi).next()?.value[1];
		const series = salesBySeries.find(({ name }) => name === seriesName)
		const sale = series.sales.find(({ token_type }) => seriesName === token_type)
		setState({ series, sale, args: {} })
		dispatch(loadCodeFromSrc('mint-preview', series.src))
	}, [salesBySeries]);

	const handlePurchase = async () => {
		const { series, args } = state
		const mint = Object.values(args)
		if (series.params.mint.length && !mint.length) {
			return alert('Choose some values to make this unique')
		}
		const tokens = await dispatch(getTokensForSeries(series.name))
		const exists = tokens.some(({ series_args }) => {
			// console.log(JSON.stringify(series_args.mint.sort()), JSON.stringify(mint.sort()))
			return series_args.mint.length && 
			(JSON.stringify(series_args.mint.sort()) === JSON.stringify(mint.sort()))
		})
		if (exists) {
			return alert('A token with these values exists, try another combination')
		}

		await account.functionCall(marketId, 'offer', {
			nft_contract_id: contractId,
			token_id: state.sale.token_id,
			memo: JSON.stringify({
				name: state.series.name,
				mint,
				owner: []
			})
		}, GAS, parseNearAmount('1'))
	}

	const { series, args = {} } = state
	const options = {}
	const params = []
	if (series) {
		Object.entries(getParams(series.src).params.mint).forEach(([k, v]) => {
			options[k] = () => {
				const input = window.prompt(`Update ${k}. Use the same format as the default value provided.`, JSON.stringify(v.default))
				const newArgs = { ...args, [k]: input }
				setState({ ...state, args: newArgs })
				let newCode = series.src
				Object.entries(newArgs).forEach(([k, v]) => newCode = newCode.replace(new RegExp(`{{${k}}}`), v))
				dispatch(loadCodeFromSrc('mint-preview', newCode))
			}

			params.push({
				name: k,
				default: v.default,
				type: v.type
			})
		})
	}

	return <>
		<div className="mint">
			<div className="menu no-barcode">
				<div className="bar">
					<div onClick={() => update('app.mintMenu', mintMenu === 'left' ? false : 'left')}>Options</div>
					<div onClick={() => handlePurchase()}>Purchase</div>
				</div>
				{
					mintMenu === 'left' && <div className="sub below">
						<Menu {...{
							app, menuKey: 'mintMenu', update, options
						}} />
					</div>
				}
			</div>

			<div className="iframe">
				<iframe {...{
					id: 'mint-preview',
				}} />
			</div>

			<div className="mint-params">
				{
					params.map(({ name, type }) => {
						// TODO debounce
						return <div key={name}>
							<span>{name}</span>
							<input type="color" onChange={(e) => {
								const color = hexToRgb(e.target.value, true, true)
								const input = color.concat([1])
								const newArgs = { ...args, [name]: JSON.stringify(input) }
								setState({ ...state, args: newArgs })
								let newCode = series.src
								Object.entries(newArgs).forEach(([k, v]) => newCode = newCode.replace(new RegExp(`{{${k}}}`), v))
								dispatch(loadCodeFromSrc('mint-preview', newCode))
							}} />
						</div>
					})
				}
			</div>
		</div>

	</>;
};

