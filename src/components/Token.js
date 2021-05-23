import React, { useEffect, useState } from 'react';
import { GAS, contractId, marketId, parseNearAmount } from '../state/near';
import { loadCodeFromSrc, getParams } from '../state/code';
import { getToken } from '../state/views';
import { hexToRgb } from '../utils/color';
import { Menu } from './Menu';
import { Frame } from './Frame';

export const Token = ({ app, pathParts, views, update, dispatch, account }) => {

	const { token } = views;

	const [state, setState] = useState({});

	useEffect(() => {
		if (pathParts[2] && pathParts[2].length) dispatch(getToken(pathParts[2]));
	}, []);

	useEffect(() => {
		if (!token) return;
		const { codeId, codeSrc, series_args } = token
		dispatch(loadCodeFromSrc(codeId, codeSrc, series_args));
		const { params } = getParams(codeSrc)
		setState({ ...state, owner: params.owner, args: {} })
	}, [token]);

	if (!token) return null;


	const isOwner = token.owner_id === account.accountId
	const params = []
	const { args, owner } = state
	if (owner) {
		Object.entries(owner).forEach(([name, { default: init, type }]) => params.push({ name, init, type }))
	}

	const updateArgs = (name, value) => {
		if (!value.length) return
		const newArgs = { ...args, [name]: value };
		setState({ ...state, args: newArgs });
		let newCode = token.codeSrc;
		Object.entries(newArgs).forEach(([k, v]) => newCode = newCode.replace(new RegExp(`{{${k}}}`), v));
		dispatch(loadCodeFromSrc(token.codeId, newCode));
	}

	return <>

		<div className="menu no-barcode">
			<div className="bar">
				<div onClick={() => handleOffer()}>Update</div>
				<div onClick={() => handleOffer()}>Sell</div>
			</div>
		</div>

		<div className="gallery">
			<Frame {...{ items: [token], menu: false }} />
		</div>
		{
			isOwner && <div className="owner-params">
				{
					params.map(({ name, type }) => {
						return <div key={name}>
							<span>{name}</span>
							{
								type.indexOf('int') > -1 &&
								<input type="number" onChange={(e) => updateArgs(name, e.target.value)} />
							}
						</div>
					})
				}
			</div>
		}
		
	</>;
};

