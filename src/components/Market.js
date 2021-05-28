import React, { useEffect, useState } from 'react';
import { loadEverything } from '../state/views';
import { loadCodeFromSrc } from '../state/code';
import { contractId, marketId, GAS } from '../state/near';
import {Frame} from './Frame';

export const Market = ({ dispatch, views, account }) => {

	const { everything } = views;
	
	useEffect(() => {
		dispatch(loadEverything());
	}, []);

	const handleOffer = async (item) => {
		if (!account) {
			return alert('Must sign in with NEAR Wallet to purchase');
		}
		const { token_id } = item;
		await account.functionCall(marketId, 'offer', {
			nft_contract_id: contractId,
			token_id,
		}, GAS, item.sales[0].conditions.near);
	};

	useEffect(() => {
		if (!everything.length) return;
		everything.forEach(({ codeId: id, codeSrc: src, series_args: args, owner_id, num_transfers }) => {
			dispatch(loadCodeFromSrc({
				id, src, args, owner_id, num_transfers
			}));
		});
	}, [everything.length]);

	return <>
		<div className="gallery">
			<Frame {...{ items: everything, handleOffer }} />
		</div>
	</>;
};

