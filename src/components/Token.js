import React, { useEffect, useState } from 'react';
import BN from 'bn.js';
import { GAS, contractId, marketId, parseNearAmount } from '../state/near';
import { loadCodeFromSrc, getParams } from '../state/code';
import { getToken } from '../state/views';
import { networkId, getSignature } from '../utils/near-utils';
import { Frame } from './Page';
import { Params } from './Params';

export const Token = ({ app, pathParts, views, update, dispatch, account }) => {

	const { image } = app
	const { token, storagePerSale } = views;
	const isOwner = token?.owner_id === account?.accountId;

	const [state, setState] = useState({ args: {} });

	useEffect(() => {
		if (pathParts[2] && pathParts[2].length) dispatch(getToken(pathParts[2]));
	}, []);

	const handleImage = async () => {
		if (!image) return

		const sample = document.createElement('img')
		sample.src = URL.createObjectURL(new Blob([new Uint8Array(image)]));
		document.body.appendChild(sample)

		const { token_id: tokenId } = token
		const params = JSON.stringify({
			// title: tokenId,
			// description: 'Sick Generative Art @ GNR8.org',
			nft: { contractId, tokenId },
			redirect: encodeURIComponent(window.origin + '/#/token/' + tokenId)
		});
		const headersConfig = {
			'near-network': networkId,
			'near-signature': JSON.stringify(await getSignature(account)),
		}
		const headers = new Headers(headersConfig)
		const result = await fetch('https://helper.nearapi.org/v1/upload/' + params, {
			headers,
			method: 'POST',
			body: image,
		}).then((r) => r.json())

		console.log(result)
	}
	useEffect(handleImage, [image]);

	useEffect(() => {
		if (!token) return;
		const { series_args, src } = token
		const { params: { mint, owner } } = getParams(src);
		const args = {};
		Object.entries(mint).forEach(([name], i) => args[name] = series_args.mint[i]);
		Object.entries(owner).forEach(([name], i) => args[name] = series_args.owner[i]);
		setState({ ...state, mint, owner, args });
	}, [token]);

	const updateArgs = (name, value) => {
		if (!isOwner) return
		if (!value.length) return;
		const newArgs = { ...args, [name]: value };
		setState({ ...state, args: newArgs });
		let newCode = token.src;
		Object.entries(newArgs).forEach(([k, v]) => newCode = newCode.replace(new RegExp(`{{${k}}}`), v));
		const { owner_id, num_transfers } = token
		dispatch(loadCodeFromSrc({
			id: token.id, src: newCode, owner_id, num_transfers
		}));
	};

	const handleUpdate = async () => {
		if (!isOwner) return
		const { token_id, src } = token;
		const { args: newArgs } = state;
		const { params: { owner } } = getParams(src);

		const args = {}
		Object.entries(owner).forEach(([name, value], i) => args[name] = newArgs[name] || series_args.owner[i] || value.default);

		await account.functionCall({
			contractId,
			methodName: 'update_token_owner_args',
			args: {
				token_id,
				owner_args: Object.values(args),
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('0.1')
		});
	};

	const handleUpload = async () => {
		if (!isOwner) return console.warn('not owner')
		const iframe = document.getElementById(token.id);
		update('app', { image: null });
		iframe.contentWindow.postMessage({ type: 'image' }, '*')
	};

	const handleSell = async () => {
		if (!isOwner) return
		const { token_id } = token;

		const num_sales = new BN(await account.viewFunction(marketId, 'get_supply_by_owner_id', { account_id: account.accountId }));
		const storage = new BN(await account.viewFunction(marketId, 'storage_paid', { account_id: account.accountId }));

		if (num_sales.mul(storagePerSale).gte(storage)) {
			const mul = window.prompt('Must deposit some NEAR to list sales. How many sales would you like to deposit for?');
			if (!/^\d+$/.test(mul) || parseInt(mul) === NaN) {
				return alert('Not a number sorry, try again!');
			}
			return await account.functionCall({
				contractId: marketId,
				methodName: 'storage_deposit',
				gas: GAS,
				attachedDeposit: storagePerSale.mul(new BN(mul)).toString()
			});
		}

		await account.functionCall({
			contractId,
			methodName: 'nft_approve',
			args: {
				token_id,
				account_id: marketId,
				msg: JSON.stringify({
					sale_conditions: [
						{ ft_token_id: "near", price: parseNearAmount(window.prompt('Selling price?\n(in NEAR, or 0 to accept bids)')) }
					]
				})
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('0.1')
		});
	};

	const handleRemoveSale = async () => {
		if (!isOwner) return
		const { token_id } = token;

		await account.functionCall({
			contractId: marketId,
			methodName: 'remove_sale',
			args: {
				nft_contract_id: contractId,
				token_id
			},
			gas: GAS,
			attachedDeposit: 1
		});
	};


	if (!token) return null;

	const params = [];
	const { args, owner } = state;
	if (owner) {
		Object.entries(owner).forEach(([name, { default: init, type }]) => params.push({ name, init, type }));
	}
	
	const argVals = Object.values(state.args);
	const isChanged = argVals.length && JSON.stringify(token.series_args.owner) !== JSON.stringify(argVals);

	return <>
		<div className="menu no-barcode">
			<div className="bar">
				{
					isOwner ?
						<div
							style={{ visibility: isChanged ? 'visible' : 'hidden' }}
							onClick={() => handleUpdate()}
						>
						Update
						</div>
						:
						<div onClick={() => history.push('/')}>
						Back
						</div>
				}
				{isOwner && <>
					{
						token.sales.length > 0 && !!token.sales[0] ?
							<div onClick={() => handleRemoveSale()}>Remove Sale</div>
							:
							<div onClick={() => handleSell()}>Sell</div>
					}
				</>}
			</div>
		</div>

<button onClick={() => handleUpload()}>Upload Image</button>

		<div className="gallery">
			<Frame {...{ dispatch, items: [token], menu: !isOwner }} />
		</div>
		{
			isOwner && <div className="owner-params">
				<Params {...{ params, args, updateArgs }} />
			</div>
		}
	</>;
};

