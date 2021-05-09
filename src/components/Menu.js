import React, { useEffect, useState } from 'react';

import * as nearAPI from 'near-api-js';
import { updateWallet } from '../state/near';
import {
	getContract,
	contractMethods,
	GAS
} from '../utils/near-utils';
const {
	KeyPair,
	utils: { PublicKey,
		format: {
			formatNearAmount
		} }
} = nearAPI;

export const Menu = ({ app, menuKey, update, options }) => {
	return <div className={app[menuKey]}>
		<div className="close" onClick={() => {
			update('app.' + menuKey, false);
		}}>✕</div>
		{
			Object.entries(options).map(([k, v]) => 
				<div key={k} className="item" onClick={() => {
					v();
					update('app.' + menuKey, false);
				}}>{k}</div>	
			)
		}
	</div>;
};

