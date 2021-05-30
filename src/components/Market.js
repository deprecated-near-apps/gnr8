import React, { useEffect, useState } from 'react';
import { loadEverything, loadMarket } from '../state/views';
import { contractId, marketId, GAS } from '../state/near';
import {Frame} from './Frame';

const NUM_PER_PAGE = 4

export const Market = ({ dispatch, views, account }) => {

	const [page, setPage] = useState(0)

	const { market } = views;
	
	useEffect(() => {
		dispatch(loadMarket());
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
	
	const items = market.slice(page * NUM_PER_PAGE, (page+1) * NUM_PER_PAGE)
	const prevVisibility = page > 0 ? 'visible' : 'hidden'
	const nextVisibility = (page+1) < market.length / NUM_PER_PAGE ? 'visible' : 'hidden'

	return <>
		<div className="pagination">
			<div style={{visibility: prevVisibility }} onClick={() => setPage(page - 1)}>Prev</div>
			<div style={{visibility: nextVisibility }} onClick={() => setPage(page + 1)}>Next</div>
		</div>
		<div className="gallery">
			<Frame {...{ dispatch, items, handleOffer }} />
		</div>
		<div className="pagination bottom">
			<div style={{visibility: prevVisibility }} onClick={() => setPage(page - 1)}>Prev</div>
			<div style={{visibility: nextVisibility }} onClick={() => setPage(page + 1)}>Next</div>
		</div>
	</>;
};

