import { State } from '../utils/state';

import { initNear } from './near';

const initialState = {
	app: {
		mounted: false,
		tab: 1,
		sort: 2,
		filter: 1,
	},
	near: {
		initialized: false,
		pendingApprovals: []
	},
	views: {
		storagePerSale: null,
		tokensPerOwner: [],
		seriesPerOwner: [],
		everything: [],
		tokens: [],
		token: null,
		sales: [],
		series: [],
		packages: [],
	}
};

export const { appStore, AppProvider } = State(initialState, 'app');

export const onAppMount = () => async ({ update, getState, dispatch }) => {
	update('app', { mounted: true });
	dispatch(initNear());
};
