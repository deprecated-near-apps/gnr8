import { State } from '../utils/state';
import { initNear, contractId, networkId } from './near';
import { getSignature } from '../utils/near-utils';

const DELIMETER = '@';
const FILE_HOST = 'https://files.nearapi.org/file/nearapi/';

const initialState = {
	app: {
		mounted: false,
		tab: 1,
		sort: 2,
		filter: 1,
		consoleLog: [],
		image: null,
		DELIMETER,
		FILE_HOST,
	},
	near: {
		initialized: false,
		pendingApprovals: []
	},
	views: {
		NUM_PER_PAGE: 6,

		storagePerSale: null,
		tokensPerOwner: [],
		seriesPerOwner: [],
		everything: [],
		tokens: [],
		token: null,
		sales: [],
		packages: [],

		market: [],
		gallery: [],
		series: [],
		collection: [],
		mint: null,
		
	}
};

export const getMediaUrl = (contractId, tokenId) => FILE_HOST + contractId + DELIMETER + (tokenId ? tokenId + '.png' : '');

export const { appStore, AppProvider } = State(initialState, 'app');

export const onAppMount = () => async ({ update, getState, dispatch }) => {
	update('app', { mounted: true });
	dispatch(initNear());
};

export const setDialog = (dialog) => async ({ update, getState, dispatch }) => {
	return new Promise((resolve, reject) => {
		dialog.resolve = async(res) => {
			resolve(res);
			update('app', { dialog: null });
		};
		dialog.reject = async() => {
			// reject('closed by user')
			update('app', { dialog: null });
		};
		update('app', { dialog });
	});
};

export const getPrice = (msg) => async({ dispatch }) => {
	const result = await dispatch(setDialog({
		msg,
		input: [
			{placeholder: 'Price in NEAR?', type: 'number'},
		]
	}));
	if (!result) return;
	const [userPrice] = result;
	console.log(/^\d+$/.test(userPrice));
	if (!/^-?\d*(\.\d+)?$/.test(userPrice)) {
		return dispatch(setDialog({
			msg: 'Not a valid price. Try again!',
			info: true
		}));
	}
	return userPrice;
};

export const getFrameMedia = (id) => async ({ update, getState, dispatch }) => {
	await update('app', { image: null });
	const iframe = document.getElementById(id);
	update('app', { image: null });
	iframe.contentWindow.postMessage({ type: 'image' }, '*');
};

export const uploadMedia = async ({account, image, token}) => {
	// const sample = document.createElement('img')
	// sample.src = URL.createObjectURL(new Blob([new Uint8Array(image)]));
	// document.body.appendChild(sample)

	const { token_id: tokenId } = token;
	const params = JSON.stringify({
		// title: tokenId,
		// description: 'Sick Generative Art @ GNR8.org',
		nft: { contractId, tokenId },
		redirect: encodeURIComponent(window.origin + '/#/token/' + tokenId)
	});
	const headersConfig = {
		'near-network': networkId,
		'near-signature': JSON.stringify(await getSignature(account)),
	};
	const headers = new Headers(headersConfig);
	const response = await fetch('https://helper.nearapi.org/v1/upload/' + params, {
		headers,
		method: 'POST',
		body: image,
	}).then((r) => r.json());

	return response;
};