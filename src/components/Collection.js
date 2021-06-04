import React, { useEffect, useState } from 'react';
import { loadCollection } from '../state/views';
import { acceptOffer } from '../state/actions';
import {Page} from './Page';

export const Collection = ({ dispatch, views, account, near }) => {
	if (!account) return null;

	const [loading, setLoading] = useState({
		title: 'Loading...',
		sub: null,
		cta: null,
	});

	const { collection } = views;
	
	const items = collection;

	const mount = async () => {
		const items = await dispatch(loadCollection(account.accountId));
		if (!items.length) {
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

		<Page {...{ account, dispatch, items, acceptOffer }} />
	</>;
};
