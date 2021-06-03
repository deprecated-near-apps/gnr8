import React, { useEffect, useState } from 'react';
import { loadEverythingForOwner, loadCollection } from '../state/views';
import { loadCodeFromSrc } from '../state/code';
import {Page} from './Page';

export const Collection = ({ dispatch, views, account, near }) => {
	if (!account) return null;

	const [loading, setLoading] = useState({
		title: 'Loading...',
		sub: null,
		cta: null,
	});

	const { tokensPerOwner, seriesPerOwner } = views;
	const items = [...tokensPerOwner, ...seriesPerOwner];

	const mount = async () => {
		dispatch(loadCollection(account.accountId))
		const { tokensPerOwner, seriesPerOwner } = await dispatch(loadEverythingForOwner(account.accountId));
		if ([...tokensPerOwner, ...seriesPerOwner].length === 0) {
			return setLoading({
				title: 'No Tokens',
				sub: 'Try creating or purchasing a token from a series!',
				cta: <div onClick={() => history.push('/')}>Go to Market</div>
			});
		}
		setLoading(null);
	};
	useEffect(mount, []);

	return <>
	
		{ loading && <center>
			<h1>{ loading.title }</h1>
			<h4>{ loading.sub }</h4>
			{ loading.cta }
		</center>}

		<Page {...{ account, dispatch, items }} />
	</>;
};
