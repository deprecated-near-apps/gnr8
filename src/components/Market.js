import React, { useEffect } from 'react';
import { loadMarket } from '../state/views';
import { acceptOffer, makeOffer } from '../state/actions';
import { Page } from './Page';

export const Market = ({ dispatch, views, account }) => {

	const { market } = views;
	
	useEffect(() => {
		dispatch(loadMarket());
	}, []);

	return <Page {...{ account, dispatch, items: market, acceptOffer, makeOffer }} />;
};

