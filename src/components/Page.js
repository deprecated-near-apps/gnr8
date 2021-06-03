import React, { useEffect, useState } from 'react';
import { loadCodeFromSrc } from '../state/code';
import { formatNearAmount } from '../utils/near-utils';

const Item = (item) => {

	let {
		id, src,
		owner_id, is_sale, is_series, is_token,
		conditions,
		series: { params, claimed = 0 } = {},
		token: {
			series_args: args,
			num_transfers,
		} = {},
		// for all items
		dispatch, menu, handleOffer
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

	return (
		<div key={id} className="iframe">
			<iframe {...{ id }} />
			{
				menu && <>
					{
						is_sale && <>
							{is_series ?
								<div className="top-bar"
									onClick={() => history.push('/mint/' + id)}
								>
									<div>{params.max_supply - claimed} / {params.max_supply}</div>
									{claimed < params.max_supply &&
										<div>{formatNearAmount(conditions.near)} Ⓝ</div>
									}
								</div>
								:
								<div className="top-bar"
									onClick={() => handleOffer(item)}
								>
									<div>Buy</div>
									<div>{formatNearAmount(conditions.near)} Ⓝ</div>
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
	items,
	menu = true,
	handleOffer = () => {}
}) => items.map((item) => <Item {...{key: item.id, ...item, dispatch, menu, handleOffer}} />);

const NUM_PER_PAGE_DEFAULT = 4;

export const Page = ({
	dispatch,
	items,
	menu = true,
	handleOffer = () => {},
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
			<Frame {...{ dispatch, items, handleOffer, menu }} />
		</div>
		<div className="pagination bottom">
			<div style={{visibility: prevVisibility }} onClick={() => setPage(page - 1)}>Prev</div>
			<div style={{visibility: nextVisibility }} onClick={() => setPage(page + 1)}>Next</div>
		</div>
	</>;
};

