import React from 'react';
import { formatNearAmount } from '../utils/near-utils';

export const Frame = ({
	items,
	menu = true,
	handleOffer = () => {}
}) => {
	return items.map((item) => {

		const { codeId, owner_id, params, sales = [], claimed = 0 } = item;

		// console.log(codeId, params, sales)

		return (
			<div key={codeId} className="iframe">
				<iframe {...{ id: codeId }} />
				{
					menu && <>
						{
							sales.length === 1 && <>
								{params ?
									<div className="top-bar"
										onClick={() => history.push('/mint/' + codeId)}
									>
										<div>{params.max_supply - claimed} / {params.max_supply}</div>
										{claimed < params.max_supply &&
                                            <div>{formatNearAmount(sales[0].conditions.near)} Ⓝ</div>
										}
									</div>
									:
									<div className="top-bar"
										onClick={() => handleOffer(item)}
									>
										<div>Buy</div>
										<div>{formatNearAmount(sales[0].conditions.near)} Ⓝ</div>
									</div>
								}
							</>
						}
						{ menu !== 'onlyTop' && <div
							className="bottom-bar"
							onClick={() => params ? history.push('/mint/' + codeId) : history.push('/token/' + codeId)}
						>
							<div>{codeId}</div>
							<div>{owner_id}</div>
						</div>}
					</>
				}
			</div>
		);
	});
};

