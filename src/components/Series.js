import React, { useEffect, useState } from 'react';
import { loadSeriesRange } from '../state/views';
import { loadCodeFromSrc } from '../state/code';

export const Series = ({ dispatch, views, account }) => {

	const { series } = views;

	useEffect(() => {
		dispatch(loadSeriesRange());
	}, []);

	useEffect(() => {
		if (!series.length) return;
		series.forEach(({ codeId, codeSrc }) => dispatch(loadCodeFromSrc(codeId, codeSrc)));
	}, [series.length]);

	return <>
		<div className="gallery">
			{
				series.map(({ codeId, owner_id, params, sales = [], claimed = 0 }) => 
					<div key={codeId} className="iframe">
						<iframe {...{ id: codeId }} />
						<div onClick={() => history.push('/token/' + codeId)}>
							<div>{codeId}</div>
							<div>{owner_id}</div>
						</div>
						{ params && sales.length === 1 && <div>
							<div>{claimed} / {params.max_supply} Claimed</div>
							{claimed < params.max_supply && 
							<div onClick={() => history.push('/mint/' + codeId)}>Mint</div>
							}
						</div> }
					</div>)
			}
		</div>
	</>;
};

