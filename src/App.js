import React, { useContext, useEffect, useState } from 'react';

import { appStore, onAppMount } from './state/app';
import { networkId } from './state/near';
import { useHistory, pathAndArgs } from './utils/history';

import { Menu } from './components/Menu';
import { Gallery } from './components/Gallery';
import { Create } from './components/Create';
import { Mint } from './components/Mint';

import NearLogo from 'url:./img/near_icon.svg';

import './App.scss';

const App = () => {
	const { state, dispatch, update } = useContext(appStore);

	const { app, app: { menu }, near, wallet, contractAccount, account, loading } = state;

	const onMount = () => {
		dispatch(onAppMount());
	};
	useEffect(onMount, []);
	const [href, setHref] = useState(window.location.href);
	useHistory(() => {
		setHref(window.location.href);
	}, true);
	const { path, args } = pathAndArgs();
	console.log(path, args, path === '/');

	const toggleMainMenu = (which) => {
		update('app.menu', menu === which ? false : which);
		update('app.createMenu', false);
	};

	return <>
		{ loading && <div className="loading">
			<img src={NearLogo} />
		</div>
		}

		<div className="menu">
			<div className="bar">
				{wallet && <>
					{wallet.signedIn ?
						<div onClick={() => toggleMainMenu('left')}>
							{account.accountId.replace('.' + networkId, 'oaijpweioufhawpeiufhawpoeifjawpoeifhaepiughpawoeifjdapwoeifjpwoef')}
						</div> :
						<div onClick={() => wallet.signIn()}>WALLET</div>}
				</>}
				<div onClick={() => toggleMainMenu('right')}>GNR8</div>
			</div>
			{
				!!menu &&
				<div className="sub">
					{menu === 'left' && <Menu {...{
						app, menuKey: 'menu', update, options: {
							'ᐅ Sign Out': () => wallet.signOut()
						}
					}} />}
					{menu === 'right' && <Menu {...{
						app, menuKey: 'menu', update, options: {
							'Gallery ᐊ': () => history.push('/'),
							'Create ᐊ': () => history.push('/create'),
							'Mint ᐊ': () => history.push('/mint'),
						}
					}} />}
				</div>
			}

		</div>

		<section>
			{ path === '/' && <Gallery /> }
			{ path === '/create' && <Create {...{ app, update, account, contractAccount }} /> }
			{ path === '/mint' && <Mint /> }
		</section>

	</>;
};

export default App;
