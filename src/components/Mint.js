import React, { useEffect, useState } from 'react';
import { GAS, contractId, marketId, parseNearAmount } from '../state/near';
import { loadCodeFromSrc, getParams } from '../state/code';
import { loadMint, getTokensForSeries } from '../state/views';
import { Menu } from './Menu';
import { Params } from './Params';
import { Frame } from './Page';

export const Mint = ({ app, path, views, update, dispatch, account }) => {

	const { mintMenu } = app;
	const { mint: item } = views;

	const [state, setState] = useState({ args: {} });

	const seriesName = path.matchAll(/\/mint\/(.+)/gi).next()?.value[1]

	useEffect(() => {
		dispatch(loadMint(seriesName));
	}, []);

	const handleOffer = async () => {
		const { series } = item;
		const { args } = state;
		if (series.claimed === series.params.max_supply) {
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

	const updateArgs = (name, value) => {
		if (!value.length) return;
		const newArgs = { ...args, [name]: value };
		setState({ args: newArgs });
		let newCode = item.series.src;
		Object.entries(newArgs).forEach(([k, v]) => newCode = newCode.replace(new RegExp(`{{${k}}}`), v));
		dispatch(loadCodeFromSrc({
			id: item.series.series_name, src: newCode, owner_id: item.owner_id
		}));
	};

	let mintMenuOptions = {}
	const params = [];
	if (item) {
		Object.entries(getParams(item.series.src).params.mint).forEach(([k, v]) => {
			params.push({
				name: k,
				default: v.default,
				type: v.type
			});
		});
		mintMenuOptions = {
			[item.series.series_name]: {
				frag: <>
					<div>A itemable series with a total supply of {item.series.params.max_supply}.</div>
					{ item.series.params.enforce_unique_mint_args &&
					<div>
						Each combination of minting parameters below
						({item.series.params.mint.map((p) => p.name)})
						must be unique from other minted tokens.
					</div>}
					<div>
						Minting asks for more than list price to pay storage of your unique arguments on chain. You will be refunded any unused NEAR.
					</div>
				</>
			}
		};
	} else {
		return null;
	}

	const { args } = state

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
				<Frame {...{dispatch, items: [item], menu: 'onlyTop' }} />
			</div>

			<div className="mint-params">
				<Params {...{params, args, updateArgs}} />
			</div>
		</div>

	</>;
};

