import React, { useContext, useEffect, useState } from 'react';

import { appStore, onAppMount } from './state/app';
import { networkId } from './state/near';

import { Menu } from './components/Menu';
import { Mint } from './components/Mint';
import { Gallery } from './components/Gallery';

import NearLogo from 'url:./img/near_icon.svg';

import './App.scss';

const App = () => {
	const { state, dispatch, update } = useContext(appStore);

	const { app: { menu }, near, wallet, contractAccount, account, loading } = state;

	const onMount = () => {
		dispatch(onAppMount());
	};
	useEffect(onMount, []);

	return <>
		{ loading && <div className="loading">
			<img src={NearLogo} />
		</div>
		}

		<div className="menu">
			<div className="bar">
				{ wallet && <>
					{ wallet.signedIn ?
					<div onClick={() => update('app.menu', menu === 'profile' ? false : 'profile')}>
						{account.accountId.replace('.' + networkId, '')}
					</div> :
					<div onClick={() => wallet.signIn()}>WALLET</div> }
				</> }
				<div onClick={() => update('app.menu', menu === 'menu' ? false : 'menu')}>GNR8</div>
			</div>
			<div className="sub">
				{ menu === 'profile' && <Menu {...{ update, options: {
					'➤ Sign Out': () => wallet.signOut()
				}}} /> }
				{ menu === 'menu' && <Menu {...{ menu, update, options: {
					'➤ Sign Out': () => wallet.signOut()
				}}} /> }
			</div>
		</div>

	</>;
};

export default App;
