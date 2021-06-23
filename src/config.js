const contractName = 'gnr8-1.testnet';

module.exports = function getConfig() {
	let config = {
		networkId: 'testnet',
		nodeUrl: 'https://rpc.testnet.near.org',
		// walletUrl: 'http://localhost:1234',
		walletUrl: 'https://wallet.testnet.near.org',
		helperUrl: 'https://helper.testnet.near.org',
		contractName,
	};
    
	if (process.env.REACT_APP_ENV !== undefined) {
		config = {
			explorerUrl: 'https://explorer.testnet.near.org',
			...config,
			GAS: '200000000000000',
			DEFAULT_NEW_ACCOUNT_AMOUNT: '5',
			DEFAULT_NEW_CONTRACT_AMOUNT: '5',
			GUESTS_ACCOUNT_SECRET: '5FmqL1sryHbvQP4CZzurTJTtauX5hhLUpW8tcUX5rpK8ttmyPGJL9N4v83N9R5fnE1S6TMpF9gXN4pb4d1f7h12U',
			contractMethods: {
				changeMethods: [
					'new',
				],
				viewMethods: [],
			},
			marketDeposit: '100000000000000000000000',
			marketId: 'market.' + contractName,
			contractId: contractName,
		};
	}
    
	if (process.env.REACT_APP_ENV === 'prod') {
		config = {
			...config,
			networkId: 'mainnet',
			nodeUrl: 'https://rpc.mainnet.near.org',
			walletUrl: 'https://wallet.near.org',
			helperUrl: 'https://helper.mainnet.near.org',
			contractName: 'near',
		};
	}

	return config;
};
