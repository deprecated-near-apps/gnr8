import React, { useEffect, useState } from 'react';
import { loadEverything } from '../state/views';
import { loadCodeFromSrc } from '../state/code';
import {Frame} from './Frame';

export const Market = ({ dispatch, views }) => {

	const { everything } = views;
	
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
			<Frame {...{ items: everything }} />
		</div>
	</>;
};

