import React, { useEffect, useState } from 'react';
import { loadGallery } from '../state/views';
import { Page } from './Page';

export const Gallery = ({ dispatch, views, account }) => {
	const { gallery } = views;
	
	useEffect(() => {
		dispatch(loadGallery());
	}, []);

	return <Page {...{ dispatch, items: gallery }} />;
};

