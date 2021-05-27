import BN from 'bn.js';
import getConfig from '../config';
import * as nearAPI from 'near-api-js';
import { getWallet, postSignedJson } from '../utils/near-utils';

export const {
	GAS,
	explorerUrl,
	networkId, nodeUrl, walletUrl, nameSuffix,
	contractName: contractId,
} = getConfig();

export const marketId = 'market.' + contractId;

export const {
	utils: {
		format: {
			formatNearAmount, parseNearAmount
		}
	}
} = nearAPI;

export const initNear = () => async ({ update, getState, dispatch }) => {
	const { near, wallet, contractAccount } = await getWallet();

	contractAccount.viewFunction(marketId, 'storage_amount').then((result) => {
		update('views', { storagePerSale: new BN(result)  });
	});

	window.near = near;

	wallet.signIn = () => {
		wallet.requestSignIn(contractId, 'Blah Blah');
	};
	const signOut = wallet.signOut;
	wallet.signOut = () => {
		signOut.call(wallet);
		update('wallet.signedIn', false);
		update('', { account: null });
	};

	wallet.signedIn = wallet.isSignedIn();
    
	let account;
	if (wallet.signedIn) {
		account = wallet.account();
		wallet.balance = formatNearAmount((await wallet.account().getAccountBalance()).available, 4);
		await update('', { near, wallet, contractAccount, account });
	}

	await update('', { near, wallet, contractAccount, account });
};

export const updateWallet = () => async ({ update, getState }) => {
	const { wallet } = await getState();
	wallet.balance = formatNearAmount((await wallet.account().getAccountBalance()).available, 2);
	await update('', { wallet });
};

