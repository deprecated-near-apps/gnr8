import React, { useEffect, useState } from 'react';
import { GAS, contractId, marketId, parseNearAmount } from '../state/near';
import { loadCodeFromSrc, getParams } from '../state/code';
import { loadSales, getTokensForSeries } from '../state/views';
import { Menu } from './Menu';
import { Params } from './Params';
import { Frame } from './Frame';

export const Mint = ({ app, path, views, update, dispatch, account }) => {

	const { mintMenu } = app;
	const { salesBySeries } = views;

	const [state, setState] = useState({});

	useEffect(() => {
		dispatch(loadSales());
	}, []);

	useEffect(() => {
		if (!salesBySeries?.length) return;
		const seriesName = path.matchAll(/\/mint\/(.+)/gi).next()?.value[1];
		const series = salesBySeries.find(({ series_name }) => series_name === seriesName);
		const sale = series.sales.find(({ token_type }) => seriesName === token_type);
		setState({ series, sale, args: {} });
		dispatch(loadCodeFromSrc(series.series_name, series.src));
	}, [salesBySeries]);

	const handleOffer = async () => {
		const { series, args } = state;
		if (!series.sales.length) {
			return alert('None left of this series');
		}
		const mint = Object.values(args);
		const owner = Object.values(getParams(series.src).params.owner).map((p) => JSON.stringify(p.default));
		
		if (series.params.mint.length && !mint.length) {
			return alert('Choose some values to make this unique');
		}
		const tokens = await dispatch(getTokensForSeries(series.series_name));
		const exists = tokens.some(({ series_args }) => {
			// console.log(JSON.stringify(series_args.mint.sort()), JSON.stringify(mint.sort()))
			return series_args.mint.length && 
			(JSON.stringify(series_args.mint.sort()) === JSON.stringify(mint.sort()));
		});
		if (exists) {
			return alert('A token with these values exists, try another combination');
		}
		await account.functionCall(marketId, 'offer', {
			nft_contract_id: contractId,
			token_id: series.series_name,
			memo: JSON.stringify({
				series_name: series.series_name,
				mint,
				owner,
				receiver_id: account.accountId,
			})
		}, GAS, parseNearAmount('1.1'));
	};

	const { series, args = {} } = state;

	const params = [];
	if (series) {
		Object.entries(getParams(series.src).params.mint).forEach(([k, v]) => {
			// mintMenuOptions[k] = () => {
			// 	const input = window.prompt(`Update ${k}. Use the same format as the default value provided.`, JSON.stringify(v.default));
			// 	const newArgs = { ...args, [k]: input };
			// 	setState({ ...state, args: newArgs });
			// 	let newCode = series.src;
			// 	Object.entries(newArgs).forEach(([k, v]) => newCode = newCode.replace(new RegExp(`{{${k}}}`), v));
			// 	dispatch(loadCodeFromSrc(series.series_name, newCode));
			// };

			params.push({
				name: k,
				default: v.default,
				type: v.type
			});
		});
	} else {
		return null;
	}

	console.log(series);


	const mintMenuOptions = {
		[series.series_name]: {
			frag: <>
				<div>A mintable series with a total supply of {series.params.max_supply}.</div>
				{ series.params.enforce_unique_args &&
				<div>
					Each combination of minting parameters below
					({params.map((p) => p.name)})
					must be unique from other minted tokens.
				</div>}
				<div>
					Minting asks for more than list price to pay storage of your unique arguments on chain. You will be refunded any unused NEAR.
				</div>
			</>
		}
	};

	const updateArgs = (name, value) => {
		if (!value.length) return;
		const newArgs = { ...args, [name]: value };
		setState({ ...state, args: newArgs });
		let newCode = series.src;
		Object.entries(newArgs).forEach(([k, v]) => newCode = newCode.replace(new RegExp(`{{${k}}}`), v));
		dispatch(loadCodeFromSrc(series.series_name, newCode));
	};

	return <>
		<div className="mint">
			<div className="menu no-barcode">
				<div className="bar">
					<div onClick={() => update('app.mintMenu', mintMenu === 'left' ? false : 'left')}>About</div>
					<div onClick={() => handleOffer()}>Mint</div>
				</div>
				{
					mintMenu === 'left' && <div className="sub below">
						<Menu {...{
							app, menuKey: 'mintMenu', update, options: mintMenuOptions
						}} />
					</div>
				}
			</div>

			<div className="gallery">
				<Frame {...{items: [series], menu: 'onlyTop' }} />
			</div>

			<div className="mint-params">
				<Params {...{params, args, updateArgs}} />
			</div>
		</div>

	</>;
};

