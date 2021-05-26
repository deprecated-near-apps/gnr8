import React, { useEffect, useState } from 'react';
import BN from 'bn.js'
import { GAS, contractId, marketId, parseNearAmount } from '../state/near';
import { loadCodeFromSrc, getParams } from '../state/code';
import { getToken } from '../state/views';
import { Frame } from './Frame';
import { Params } from './Params';

export const Token = ({ app, pathParts, views, update, dispatch, account }) => {

	const { token, storagePerSale } = views;

	const [state, setState] = useState({});

	useEffect(() => {
		if (pathParts[2] && pathParts[2].length) dispatch(getToken(pathParts[2]));
	}, []);

	useEffect(() => {
		if (!token) return;
		const { codeId, codeSrc, series_args } = token
		dispatch(loadCodeFromSrc(codeId, codeSrc, series_args));
		const { params: { owner } } = getParams(codeSrc)
		const args = {}
		Object.entries(owner).forEach(([name], i) => args[name] = token.series_args.owner[i])
		setState({ ...state, owner, args })
	}, [token]);

	if (!token) return null;

	const isOwner = token.owner_id === account.accountId
	const params = []
	const { args, owner } = state
	if (owner) {
		Object.entries(owner).forEach(([name, { default: init, type }]) => params.push({ name, init, type }))
	}

	const updateArgs = (name, value) => {
		console.log(name, value)
		if (!value.length) return
		const newArgs = { ...args, [name]: value };
		setState({ ...state, args: newArgs });
		let newCode = token.codeSrc;
		Object.entries(newArgs).forEach(([k, v]) => newCode = newCode.replace(new RegExp(`{{${k}}}`), v));
		dispatch(loadCodeFromSrc(token.codeId, newCode));
	}

	const handleUpdate = async () => {
		const { token_id } = token;
		const { args: owner_args } = state;
		await account.functionCall({
			contractId,
			methodName: 'update_token_owner_args',
			args: {
				token_id,
				owner_args,
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('0.1')
		})
	}

	const handleSell = async () => {
		const { token_id } = token;

		const num_sales = new BN(await account.viewFunction(marketId, 'get_supply_by_owner_id', { account_id: account.accountId }))
		const storage = new BN(await account.viewFunction(marketId, 'storage_paid', { account_id: account.accountId }))

		if (num_sales.mul(storagePerSale).gte(storage)) {
			const mul = window.prompt('Must add storage to list sales. How many would you like to deposit for?')
			return await account.functionCall({
				marketId,
				methodName: 'storage_deposit',
				gas: GAS,
				attachedDeposit: storagePerSale.mul(mul)
			})
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
		})
	}

	return <>


		<div className="menu no-barcode">
			{
				isOwner &&
				<div className="bar">
					<div onClick={() => handleUpdate()}>Update</div>
					<div onClick={() => handleSell()}>Sell</div>
				</div>
			}
		</div>

		<div className="gallery">
			<Frame {...{ items: [token], menu: false }} />
		</div>
		{
			isOwner && <div className="owner-params">
				<Params {...{ params, args, updateArgs }} />
			</div>
		}

	</>;
};

