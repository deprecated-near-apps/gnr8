import React, { useEffect, useState } from 'react';
import { loadSeries } from '../state/views';
import { loadCodeFromSrc } from '../state/code';
import {Frame} from './Frame';

export const Series = ({ dispatch, views, account }) => {

	const { series } = views;

	useEffect(() => {
		dispatch(loadSeries());
	}, []);

	return <>
		<div className="gallery">
			<Frame {...{ dispatch, items: series }} />
		</div>
	</>;
};

