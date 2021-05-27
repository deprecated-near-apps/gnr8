import React, { useContext, useEffect } from 'react';

import { appStore, onAppMount } from './state/app';
import { networkId } from './state/near';
import { useHistory, pathAndArgs } from './utils/history';

import { Menu } from './components/Menu';

import { Market } from './components/Market';
import { Collection } from './components/Collection';
import { Series } from './components/Series';
import { Mint } from './components/Mint';
import { Token } from './components/Token';
import { Create } from './components/Create';

import NearLogo from 'url:./img/near_icon.svg';

import './App.scss';

const App = () => {
	const { state, dispatch, update } = useContext(appStore);
	const { app, app: { menu }, near, views, wallet, contractAccount, account, loading } = state;

	const onMount = () => {
		dispatch(onAppMount());
	};
	useEffect(onMount, []);
	useHistory(() => {
		toggleMainMenu(false);
		document.body.scrollTo(0,0);
		update('app.href', window.location.href);
	}, true);
	const { path, pathParts, args } = pathAndArgs();

	const toggleMainMenu = (which) => {
		update('app.menu', menu === which ? false : which);
		update('app.createMenu', false);
		update('app.mintMenu', false);
	};

	if (!contractAccount) return null;

	return <>
		{ loading && <div className="loading">
			<img src={NearLogo} />
		</div>
		}

		<div className="menu">
			<div className="bar">
				{wallet && <>
					{wallet.signedIn ?
						<div>
							<span onClick={() => toggleMainMenu('left')}>
								{account.accountId.replace('.' + networkId, '')}
							</span>
						</div> :
						<div onClick={() => wallet.signIn()}>SIGN IN</div>}
				</>}
				<div onClick={() => toggleMainMenu('right')}>GNR8</div>
			</div>
			{
				!!menu &&
				<div className="sub">
					{menu === 'left' && <Menu {...{
						app, menuKey: 'menu', update, options: {
							'▷ Sign Out': () => {
								history.push('/');
								wallet.signOut();
							}
						}
					}} />}
					{menu === 'right' && <Menu {...{
						app, menuKey: 'menu', update, options: {
							'Market ᐊ': () => history.push('/'),
							'Series ᐊ': () => history.push('/series'),
							'Collection ᐊ': () => history.push('/collection'),
							'Create ᐊ': () => history.push('/create'),
						}
					}} />}
				</div>
			}

		</div>

		<section>
			{ path === '/' && <Market {...{ dispatch, views, account }} /> }
			{ path === '/series' && <Series {...{ dispatch, views, args }} /> }
			{ path === '/collection' && <Collection {...{ dispatch, views, account, near }} /> }
			{ path === '/create' && <Create {...{ app, views, update, dispatch, account }} /> }
			{ path.substr(0, 5) === '/mint' && <Mint {...{ app, path, views, update, dispatch, account }} /> }
			{ path.substr(0, 6) === '/token' && <Token {...{ app, pathParts, views, update, dispatch, account }} /> }
		</section>

	</>;
};

export default App;
