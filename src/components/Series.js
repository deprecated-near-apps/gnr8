import React, { useEffect, useState } from 'react';
import { loadSeriesRange } from '../state/views';
import { loadCodeFromSrc } from '../state/code';
import {Frame} from './Frame';

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
			<Frame {...{ items: series }} />
		</div>
	</>;
};

