import React, { useEffect, useState } from 'react';
import { loadEverything, loadEverythingForOwner } from '../state/views';
import { loadCodeFromSrc } from '../state/code';
import { GAS, contractId, parseNearAmount } from '../state/near';

export const Collection = ({ dispatch, views, account }) => {

	const { everything, tokensPerOwner, seriesPerOwner } = views
	const tokens = account ? [...tokensPerOwner, ...seriesPerOwner] : everything

	console.log(tokens)

	useEffect(() => {
		account ? dispatch(loadEverythingForOwner(account.accountId)) : dispatch(loadEverything())
	}, [])

	useEffect(() => {
		if (!tokens.length) return
		tokens.forEach(({ codeId, codeSrc, series_args }) => {
			dispatch(loadCodeFromSrc(codeId, codeSrc, series_args))
		})
	}, [tokens.length])

	return <>
		<div className="gallery">
			{
				tokens.map(({ codeId, owner_id, params, sales = [], tokens = [] }) => 
				<div key={codeId} className="iframe">
					<iframe {...{ id: codeId }} />
					<div onClick={() => params ? history.push('/mint/' + codeId) : history.push('/token/' + codeId)}>
						<div>{codeId}</div>
						<div>{owner_id}</div>
					</div>
					{ params && <div>
						<div>{tokens.length} / {params.max_supply} Minted</div>
						<div onClick={() => {
							const limit = window.prompt('How Many?')
							if (tokens.length + parseInt(limit, 10) > parseInt(params.max_supply, 10)) {
								return alert('Cannot mint more than max supply')
							}
							account.functionCall(contractId, 'nft_mint_batch', {
								series_name: codeId,
								limit,
							}, GAS, parseNearAmount('0.1'))
						}}>Mint</div>
					</div> }
				</div>)
			}
		</div>
	</>;
};

