import React, { useEffect, useState } from 'react';
import { loadCodeFromSrc } from '../state/code';
import { contractId } from '../state/near';
import { getShareUrl } from '../state/views';
import { share } from '../utils/mobile';
import { setDialog } from '../state/app';
import { formatNearAmount } from '../utils/near-utils';

const TopBar = (item) => {

	let {
		account,
		dispatch,
		series,
		id,
		is_owner, is_series,
		conditions,
		bids = {},
		params,
		claimed,
		makeOffer, acceptOffer,
	} = item;

	if (!conditions) {
		conditions = item.sale?.conditions;
		bids = item.sale?.bids;
	}
	if (!account) return null;

	if (is_series) {
		if (!conditions) return null;
		if (!claimed) claimed = series.claimed;
		return (
			<div className="top-bar" onClick={() => history.push('/mint/' + id)}>
				<div>{params.max_supply - claimed} / {params.max_supply}</div>
				{claimed < params.max_supply &&
					<div>{formatNearAmount(conditions.near)} Ⓝ</div>
				}
			</div>
		);
	}
	if (!is_owner) {
		if (!conditions) return null;
		return (
			<div className="top-bar" onClick={() => dispatch(makeOffer(account, item, conditions.near))}>
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
		);
	}
	if (bids?.near && acceptOffer) {
		return (
			<div className="top-bar" onClick={() => dispatch(acceptOffer(account, item, formatNearAmount(bids.near.price) + ' Ⓝ'))}>
				<div>Accept Offer</div>
				<div>{bids.near.owner_id} {formatNearAmount(bids.near.price)} Ⓝ</div>
			</div>
		);
	}
	if (!conditions) return null;
	return (
		<div className="top-bar">
			<div>You are selling</div>
			<div>{conditions.near !== '0' ? <>{formatNearAmount(conditions.near)} Ⓝ</> : 'Open for Bids'}</div>
		</div>
	);
};

const Item = (item) => {

	let {
		account,
		id, src,
		owner_id, is_sale, is_series, is_token,
		conditions,
		series: { params } = {},
		token: {
			series_args: args,
			num_transfers,
		} = {},
		// for all items
		dispatch, menu,
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
	}

	if (is_sale && !conditions) {
		conditions = item.sale.conditions;
	}

	const is_owner = account?.accountId === owner_id;

	return (
		<div key={id} className="iframe">
			<iframe {...{ id }} />
			{
				menu && <>
					<TopBar {...{...item, dispatch, is_owner, params, conditions, }} />

					<div className="share"
						onClick={async () => {
							const { mobile } = share(await getShareUrl({
								nft: { contractId, tokenId: id }
							}));
							if (!mobile) {
								dispatch(setDialog({
									msg: `Link Copied to Clipboard (Control-C)`,
									choices: ['Ok'],
									noClose: true,
								}));
							}
						}}
					>&#128279;</div>

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
	makeOffer, acceptOffer,
}) => items.map((item) => <Item {...{ account, key: item.id, ...item, dispatch, menu, makeOffer, acceptOffer}} />);

const NUM_PER_PAGE_DEFAULT = 4;

export const Page = ({
	dispatch,
	account,
	items,
	menu = true,
	makeOffer, acceptOffer,
	numPerPage = NUM_PER_PAGE_DEFAULT,
}) => {
	const [page, setPage] = useState(0);

	const prevVisibility = page > 0 ? 'visible' : 'hidden';
	const nextVisibility = (page + 1) < Math.ceil(items.length / numPerPage) ? 'visible' : 'hidden';
	items = items.slice(page * numPerPage, (page + 1) * numPerPage);

	return <>
		<div className="pagination">
			<div style={{ visibility: prevVisibility }} onClick={() => setPage(page - 1)}>Prev</div>
			<div style={{ visibility: nextVisibility }} onClick={() => setPage(page + 1)}>Next</div>
		</div>
		<div className="gallery">
			<Frame {...{ account, dispatch, items, menu, makeOffer, acceptOffer }} />
		</div>
		<div className="pagination bottom">
			<div style={{ visibility: prevVisibility }} onClick={() => setPage(page - 1)}>Prev</div>
			<div style={{ visibility: nextVisibility }} onClick={() => setPage(page + 1)}>Next</div>
		</div>
	</>;
};

