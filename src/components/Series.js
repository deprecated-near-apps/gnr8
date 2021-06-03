import React, { useEffect, useState } from 'react';
import { loadSeries } from '../state/views';
import { loadCodeFromSrc } from '../state/code';
import {Page} from './Page';

export const Series = ({ dispatch, views, account }) => {

	const { series } = views;

	useEffect(() => {
		dispatch(loadSeries());
	}, []);

	return <Page {...{ account, dispatch, items: series }} />;
};

