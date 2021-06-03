import React, { useEffect, useState } from 'react';
import { loadCodeFromSrc } from '../state/code';
import { formatNearAmount } from '../utils/near-utils';

const Item = (item) => {

	let {
		account,
		id, src,
		owner_id, is_sale, is_series, is_token,
		conditions,
		bids = {},
		series: { params, claimed = 0 } = {},
		token: {
			series_args: args,
			num_transfers,
		} = {},
		// for all items
		dispatch, menu, handleOffer, handleAcceptOffer
	} = item;

	useEffect(() => {
		dispatch(loadCodeFromSrc({
			id, src, args, owner_id, num_transfers
		}));
	}, []);

	if (is_token) {
		args = item.series_args;
	}

	if (is_series) {
		if (!params) {
			params = item.params;
		}
		if (is_sale) {
			if (!!item.claimed) {
				claimed = item.claimed;
			}
			if (!conditions) {
				conditions = item.sale.conditions;
			}
		}
	}

	const isOwner = account?.accountId === owner_id

	return (
		<div key={id} className="iframe">
			<iframe {...{ id }} />
			{
				menu && <>
					{
						is_sale && <>
							{
								is_series 
								?
								account && <div className="top-bar"
									onClick={() => history.push('/mint/' + id)}
								>
									<div>{params.max_supply - claimed} / {params.max_supply}</div>
									{claimed < params.max_supply &&
										<div>{formatNearAmount(conditions.near)} Ⓝ</div>
									}
								</div>
								:
								account && !isOwner
									?
									<div className="top-bar"
										onClick={() => handleOffer(item, conditions.near)}
									>
										<div>{conditions.near !== '0' ? 'Buy' : 'Make a Bid'}</div>
										{
											conditions.near !== '0'
											?
											<div>{formatNearAmount(conditions.near)} Ⓝ</div>
											:
											bids?.near &&
											<div>{bids.near.owner_id} {formatNearAmount(bids.near.price)} Ⓝ</div>
										}
									</div>
									:
									(bids?.near && handleAcceptOffer)
									?
									<div className="top-bar"
										onClick={() => handleAcceptOffer(item, formatNearAmount(bids.near.price) +  ' Ⓝ')}
									>
										<div>Accept Offer</div>
										<div>{bids.near.owner_id} {formatNearAmount(bids.near.price)} Ⓝ</div>
									</div>
									:
									<div className="top-bar">
										<div>You are selling</div>
										<div>{conditions.near !== '0' ? <>{formatNearAmount(conditions.near)} Ⓝ</> : 'Open for Bids'}</div>
									</div>
							}
						</>
					}
					{ menu !== 'onlyTop' && <div
						className="bottom-bar"
						onClick={() => is_series ? history.push('/mint/' + id) : history.push('/token/' + id)}
					>
						<div>{id}</div>
						<div>{owner_id}</div>
					</div>}
				</>
			}
		</div>
	);
};

export const Frame = ({
	dispatch,
	account,
	items,
	menu = true,
	handleOffer = () => {},
	handleAcceptOffer,
}) => items.map((item) => <Item {...{account, key: item.id, ...item, dispatch, menu, handleOffer, handleAcceptOffer}} />);

const NUM_PER_PAGE_DEFAULT = 4;

export const Page = ({
	dispatch,
	account,
	items,
	menu = true,
	handleOffer = () => {},
	handleAcceptOffer,
	numPerPage = NUM_PER_PAGE_DEFAULT,
}) => {
	const [page, setPage] = useState(0);

	const prevVisibility = page > 0 ? 'visible' : 'hidden';
	const nextVisibility = (page+1) < Math.ceil(items.length / numPerPage) ? 'visible' : 'hidden';
	items = items.slice(page * numPerPage, (page+1) * numPerPage);

	return <>
		<div className="pagination">
			<div style={{visibility: prevVisibility }} onClick={() => setPage(page - 1)}>Prev</div>
			<div style={{visibility: nextVisibility }} onClick={() => setPage(page + 1)}>Next</div>
		</div>
		<div className="gallery">
			<Frame {...{ account, dispatch, items, menu, handleOffer, handleAcceptOffer }} />
		</div>
		<div className="pagination bottom">
			<div style={{visibility: prevVisibility }} onClick={() => setPage(page - 1)}>Prev</div>
			<div style={{visibility: nextVisibility }} onClick={() => setPage(page + 1)}>Next</div>
		</div>
	</>;
};

