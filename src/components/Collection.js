import React, { useEffect, useState } from 'react';
import BN from 'bn.js';
import { loadEverything, loadEverythingForOwner } from '../state/views';
import { loadCodeFromSrc } from '../state/code';
import { GAS, contractId, marketId, parseNearAmount } from '../state/near';
import { get, set, del } from '../utils/storage';

const TEMP_APPROVAL_DATA = 'TEMP_APPROVAL_DATA';

export const Collection = ({ dispatch, views, account, near }) => {
	if (!account) return null;

	const { tokensPerOwner, seriesPerOwner } = views;
	const tokens = [...tokensPerOwner, ...seriesPerOwner];

	useEffect(() => {
		dispatch(loadEverythingForOwner(account.accountId));
	}, []);
	
	useEffect(() => {
		if (!tokens.length) return;
		tokens.forEach(({ codeId, codeSrc, series_args }) => {
			dispatch(loadCodeFromSrc(codeId, codeSrc, series_args));
		});
	}, [tokens.length]);

	return <>
		<div className="gallery">
			{
				tokens.map(({
					codeId, owner_id, params,
					sales = [], tokens = [], unsoldTokens = [], firstSales = []
				}) => 
					<div key={codeId} className="iframe">
						<iframe {...{ id: codeId }} />
						<div onClick={() => params ? history.push('/mint/' + codeId) : history.push('/token/' + codeId)}>
							<div>{ params && 'Series: '}{codeId}</div>
							<div>{owner_id}</div>
						</div>
						{ params && <div>
							<div>
								<span>{tokens.length} / {params.max_supply} Minted</span>
							</div>
							<div>
								{tokens.length < parseInt(params.max_supply, 10) &&
							<span onClick={() => {
								const limit = window.prompt('How Many?');
								if (unsoldTokens.length + parseInt(limit, 10) > parseInt(params.max_supply, 10)) {
									return alert('Cannot mint more than max supply');
								}
								account.functionCall(contractId, 'nft_mint_batch', {
									series_name: codeId,
									limit,
								}, GAS, parseNearAmount('1'));
							}}>Mint</span>}

								{unsoldTokens.length - firstSales.length > 0 &&
							<span onClick={() => {
								const limit = window.prompt('How Many?');
								if (parseInt(limit, 10) > unsoldTokens.length) {
									return alert('Cannot sell more than you own');
								}
								const token_ids = unsoldTokens.map(({ token_id }) => token_id);
								set(TEMP_APPROVAL_DATA, {
									token_type: codeId,
									token_ids,
								});
								account.functionCall(contractId, 'nft_approve_batch', {
									token_ids,
									account_id: marketId,
								}, GAS, parseNearAmount('1'));
							}}>Sell</span>}
							</div>
						</div> }
					</div>)
			}
		</div>
	</>;
};

