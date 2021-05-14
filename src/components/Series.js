import React, { useEffect, useState } from 'react';
import { loadSeriesRange } from '../state/views';
import { loadCodeFromSrc } from '../state/code';

export const Series = ({ dispatch, views, account }) => {

	const { series } = views

	useEffect(() => {
		dispatch(loadSeriesRange())
	}, [])

	useEffect(() => {
		if (!series.length) return
		series.forEach(({ codeId, codeSrc }) => dispatch(loadCodeFromSrc(codeId, codeSrc)))
	}, [series.length])

	return <>
		<div className="gallery">
			{
				series.map(({ codeId, owner_id, params, sales }) => 
				<div key={codeId} className="iframe">
					<iframe {...{ id: codeId }} />
					<div onClick={() => history.push('/token/' + codeId)}>
						<div>{codeId}</div>
						<div>{owner_id}</div>
					</div>
					{ params && <div>
						<div>{sales.length} / {params.max_supply} Left</div>
						{!!sales.length && <div onClick={() => history.push('/mint/' + codeId)}>Mint</div>}
					</div> }
				</div>)
			}
		</div>
	</>;
};

