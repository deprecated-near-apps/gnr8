import React, { useEffect, useState } from 'react';
import { loadEverything } from '../state/views';
import { loadCodeFromSrc } from '../state/code';

export const Market = ({ dispatch, views }) => {

	const { everything } = views;

	console.log(everything);
	
	useEffect(() => {
		dispatch(loadEverything());
	}, []);

	useEffect(() => {
		if (!everything.length) return;
		everything.forEach(({ codeId, codeSrc, series_args }) => {
			dispatch(loadCodeFromSrc(codeId, codeSrc, series_args));
		});
	}, [everything.length]);

	return <>
		<div className="gallery">
			{
				everything.map(({ codeId, owner_id, params, sales = [], claimed = 0 }) => 
					<div key={codeId} className="iframe">
						<iframe {...{ id: codeId }} />
						<div onClick={() => params ? history.push('/mint/' + codeId) : history.push('/token/' + codeId)}>
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

