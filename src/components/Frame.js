import React, { useEffect } from 'react';
import { loadCodeFromSrc } from '../state/code';
import { formatNearAmount } from '../utils/near-utils';

export const Frame = ({
	dispatch,
	items,
	menu = true,
	handleOffer = () => {}
}) => {
	return items.map((item) => {

		let {
			id, src,
			owner_id, is_sale, is_series, is_token,
			conditions,
			series: { params, claimed = 0 } = {},
			token: {
				series_args: args,
				num_transfers,
			} = {},
		} = item;

		if (is_token) {
			args = item.series_args
		}

		useEffect(() => {
			dispatch(loadCodeFromSrc({
				id, src, args, owner_id, num_transfers
			}));
		}, []);

		console.log(item)

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
	});
};

