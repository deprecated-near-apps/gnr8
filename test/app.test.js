const fs = require('fs');
const fetch = require('node-fetch');
const BN = require('bn.js');
const { sha256 } = require('js-sha256');
const nearAPI = require('near-api-js');
const testUtils = require('./test-utils');
const getConfig = require('../src/config');

const {getPackages} = require('./examples/packages');
const {reglExample} = require('./examples/regl-example');

const { 
	Contract, KeyPair, Account,
	utils: { format: { parseNearAmount }},
	transactions: { deployContract, functionCall },
} = nearAPI;
const { 
	connection, initContract, getAccount, getAccountBalance,
	contract, contractAccount, contractName, contractMethods, createAccessKeyAccount,
	createOrInitAccount,
	getContract,
} = testUtils;
const { 
	networkId, GAS, GUESTS_ACCOUNT_SECRET
} = getConfig();

const PACKAGE_NAME_VERSION_DELIMETER = '@';

/// contractAccount.accountId is the NFT contract and contractAccount is the owner
/// see initContract in ./test-utils.js for details
const contractId = contractAccount.accountId;
console.log('\n\n contractId:', contractId, '\n\n');
/// the fungible token "stablecoin" contract
const stableId = 'stable.' + contractId;
/// the market contract
const marketId = 'market.' + contractId;

const seriesPremintPrepend = '||';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;

const getTokenAndSrc = async (token_id) => {
	const token = await contractAccount.viewFunction(contractId, 'nft_token', { token_id });
	const series = await contractAccount.viewFunction(contractId, 'get_series', { name: token.series_args.name });
	let { src } = series;
	series.params.mint.forEach((p, i) => src = src.replace(new RegExp(`{{${p}.*}}`, 'g'), token.series_args.mint[i]));
	series.params.owner.forEach((p, i) => src = src.replace(new RegExp(`{{${p}.*}}`, 'g'), token.series_args.owner[i]));
	return { token, src };
};

describe('deploy contract ' + contractName, () => {
	let alice, aliceId, bob, bobId,
		stableAccount, marketAccount,
		storageMinimum, storageMarket;

	const t = Date.now();
	const arg1 = t;
	const arg2 = t + '1';
	reglExample.name = reglExample.name + t;
	const owner = [
		'0.01'
	];
	const args1 = {
		series_args: {
			name: reglExample.name,
			mint: [
				'[1, 1, 1, 0.' + arg1 + ']'
			],
			owner,
		}
	};
	const args2 = {
		series_args: {
			name: reglExample.name,
			mint: [
				'[1, 1, 1, 0.' + arg2 + ']'
			],
			owner,
		}
	};
	const argsBatch = {
		series_name: reglExample.name,
		limit: '18',
	};

	// token_ids in Rust will be base64 hashes of series name + user minting args (unique)
	const tokenIds = ([
		reglExample.name + args1.series_args.mint.join(''),
		reglExample.name + args2.series_args.mint.join(''),
	].concat(([2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19])
		.map((id) => reglExample.name + id))
	).map((src, i) => {
		const hash = sha256.create();
		return (i > 1 ? seriesPremintPrepend : '') + Buffer.from(hash.update(src).array()).toString('base64');
	});

	console.log(tokenIds)

	// batch
	const numBatch = 8
	const argsBatchApprove = {
		token_ids: tokenIds.slice(2, numBatch + 2),
		account_id: marketId,
		msg: JSON.stringify({
			sale_conditions: [
				{ ft_token_id: "near", price: parseNearAmount('1')}
			]
		})
	};

	console.log('\n\n Token 1: \n', tokenIds[0], '\n', reglExample.name + args1.series_args.mint.join(''));

	/// most of the following code in beforeAll can be used for deploying and initializing contracts
	/// skip all tests if you want to deploy to production or testnet without any NFTs
	beforeAll(async () => {
	    await initContract();

		// const t = Date.now() 
		// aliceId = 'alice-' + t + '.' + contractId;
		// alice = await getAccount(aliceId);
		// console.log('\n\n Alice accountId:', aliceId, '\n\n');

		// bobId = 'bob-' + t + '.' + contractId;
		// bob = await getAccount(bobId);
		// console.log('\n\n Bob accountId:', bobId, '\n\n');

		// await contractAccount.functionCall(contractName, 'set_contract_royalty', { contract_royalty }, GAS);
		
		// /// create or get stableAccount and deploy ft.wasm (if not already deployed)
		// stableAccount = await createOrInitAccount(stableId, GUESTS_ACCOUNT_SECRET);
		// const stableAccountState = await stableAccount.state();
		// console.log('\n\nstate:', stableAccountState, '\n\n');
		// if (stableAccountState.code_hash === '11111111111111111111111111111111') {
		// 	const fungibleContractBytes = fs.readFileSync('./out/ft.wasm');
		// 	console.log('\n\n deploying stableAccount contractBytes:', fungibleContractBytes.length, '\n\n');
		// 	const newFungibleArgs = {
		// 		/// will have totalSupply minted to them
		// 		owner_id: contractId,
		// 		total_supply: parseNearAmount('1000000'),
		// 		name: 'Test Stable Coin',
		// 		symbol: 'TSC',
		// 		// not set by user request
		// 		version: '1',
		// 		reference: 'https://github.com/near/core-contracts/tree/master/w-near-141',
		// 		reference_hash: '7c879fa7b49901d0ecc6ff5d64d7f673da5e4a5eb52a8d50a214175760d8919a',
		// 		decimals: 24,
		// 	};
		// 	const actions = [
		// 		deployContract(fungibleContractBytes),
		// 		functionCall('new', newFungibleArgs, GAS)
		// 	];
		// 	await stableAccount.signAndSendTransaction(stableId, actions);
		// 	/// find out how much needed to store for FTs
		// 	storageMinimum = await contractAccount.viewFunction(stableId, 'storage_minimum_balance');
		// 	console.log('\n\n storageMinimum:', storageMinimum, '\n\n');
		// 	/// pay storageMinimum for all the royalty receiving accounts
		// 	const promises = [];
		// 	for (let i = 1; i < 6; i++) {
		// 		promises.push(stableAccount.functionCall(stableId, 'storage_deposit', { account_id: `a${i}.testnet` }, GAS, storageMinimum));
		// 	}
		// 	await Promise.all(promises);
		// } else {
		// 	/// find out how much needed to store for FTs
		// 	storageMinimum = await contractAccount.viewFunction(stableId, 'storage_minimum_balance');
		// 	console.log('\n\n storageMinimum:', storageMinimum, '\n\n');
		// }

		/** 
		 * Deploy the Market Contract and connect it to the NFT contract (contractId)
		 * and the FT contract (stable.[contractId])
		 */ 

		/// default option for markets, init with all FTs you want it to support
		const ft_token_ids = [stableId]
		
		/// create or get market account and deploy market.wasm (if not already deployed)
		marketAccount = await createOrInitAccount(marketId, GUESTS_ACCOUNT_SECRET);
		const marketAccountState = await marketAccount.state();
		console.log('\n\nstate:', marketAccountState, '\n\n');
		if (marketAccountState.code_hash === '11111111111111111111111111111111') {

			const marketContractBytes = fs.readFileSync('./out/market.wasm');
			console.log('\n\n deploying marketAccount contractBytes:', marketContractBytes.length, '\n\n');
			const newMarketArgs = {
				owner_id: contractId,
				ft_token_ids
			};
			const actions = [
				deployContract(marketContractBytes),
				functionCall('new', newMarketArgs, GAS)
			];
			await marketAccount.signAndSendTransaction(marketId, actions);

			/// NOTE market must register for all ft_token_ids it wishes to use (e.g. use this loop for standard fts)
			ft_token_ids.forEach(async (ft_token_id) => {
				const deposit = await marketAccount.viewFunction(ft_token_id, 'storage_minimum_balance');
				await marketAccount.functionCall(ft_token_id, 'storage_deposit', {}, GAS, deposit);
			})
		}
		// get all supported tokens as array
		const supportedTokens = await marketAccount.viewFunction(marketId, "supported_ft_token_ids");
		console.log('\n\n market supports these fungible tokens:', supportedTokens, '\n\n');

		// should be [false], just testing api
		const added = await contractAccount.functionCall(marketId, "add_ft_token_ids", { ft_token_ids }, GAS);
		console.log('\n\n added these tokens', supportedTokens, added, '\n\n');

		/// find out how much needed for market storage
		storageMarket = await contractAccount.viewFunction(marketId, 'storage_amount');
		console.log('\n\n storageMarket:', storageMarket, '\n\n');
	});

	test('contract owner adds packages', async () => {
		const { three, regl } = await getPackages();
		await contractAccount.functionCall(contractId, 'add_package', three, GAS, parseNearAmount('1'));
		/// add mirrors
		// delete three.src_hash
		// three.urls = ['https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js']
		// await contractAccount.functionCall(contractId, 'add_mirrors', three, GAS, parseNearAmount('1'));
		await contractAccount.functionCall(contractId, 'add_package', regl, GAS, parseNearAmount('1'));
		const getThree = await contractAccount.viewFunction(contractId, 'get_package', { name_version: three.name_version });
		expect(getThree.src_hash).toEqual(three.src_hash);
		const getRegl = await contractAccount.viewFunction(contractId, 'get_package', { name_version: regl.name_version });
		expect(getRegl.src_hash).toEqual(regl.src_hash);
	});

	test('contract owner creates series', async () => {
		await contractAccount.functionCall(contractId, 'create_series', reglExample, GAS, parseNearAmount('0.9'));
		const series = await contractAccount.viewFunction(contractId, 'get_series', { name: reglExample.name });
		expect(series.src).toEqual(reglExample.src);
	});

	test('contract owner mints NFT in series', async () => {
		const token_id = tokenIds[0];
		await contractAccount.functionCall(contractId, 'nft_mint', args1, GAS, parseNearAmount('1'));
		const { token } = await getTokenAndSrc(token_id);
		expect(token.series_args.mint[0]).toEqual(args1.series_args.mint[0]);
	});

	test('contract owner tries to mint nft with duplicate args', async () => {
		try {
			await contractAccount.functionCall(contractId, 'nft_mint', args1, GAS, parseNearAmount('1'));
			expect(false);
		} catch (e) {
			expect(/using those args already exists/gi.test(e.toString()));
		}
	});

	test('contract owner can update their owner args', async () => {
		const token_id = tokenIds[0];
		await contractAccount.functionCall(contractId, 'update_token_owner_args', {
			token_id,
			owner_args: {
				angleSpeed: '0.1'
			}
		}, GAS, parseNearAmount('1'));
		const { token, src } = await getTokenAndSrc(token_id);
		expect(token.series_args.owner[0]).toEqual('0.1');
	});

	test('contract owner (series owner) mints a batch of tokens', async () => {
		/// works cause supply 2 and using arg2
		await contractAccount.functionCall(contractId, 'nft_mint_batch', argsBatch, GAS, parseNearAmount('1'));
		const { token, src } = await getTokenAndSrc(tokenIds[2]);
		console.log(token)
		expect(token.series_args.owner.length).toEqual(0);
	});

	test('contract owner approves batch of tokens for sale on market', async () => {
		await contractAccount.functionCall(marketId, 'storage_deposit', {}, GAS,
			new BN(storageMarket).mul(new BN(numBatch)).toString()
		);
		await contractAccount.functionCall(contractId, 'nft_approve_batch', argsBatchApprove, GAS, parseNearAmount('1'));
		const sales = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_contract_id', {
			nft_contract_id: contractId,
			from_index: '0',
			limit: '100'
		});
		console.log(sales)
		expect(sales.length).toEqual(numBatch);
	});

	test('contract owner tries to mint more than supply', async () => {
		try {
			/// fails because of max_supply
			await contractAccount.functionCall(contractId, 'nft_mint', args2, GAS, parseNearAmount('1'));
			expect(false);
		} catch (e) {
			expect(/Cannot mint anymore/gi.test(e.toString()));
		}
	});


	// test('NFT contract owner mints nft and approves a sale for a fixed amount of NEAR', async () => {
	// 	const token_id = tokenIds[0];
	// 	await contractAccount.functionCall(marketId, 'storage_deposit', {}, GAS, storageMarket);
	// 	await contractAccount.functionCall(contractId, 'nft_mint', {
	// 		token_id,
	// 		metadata,
	// 		token_type: tokenTypes[0],
	// 		perpetual_royalties: {
	// 			'a1.testnet': 500,
	// 			'a2.testnet': 250,
	// 			'a3.testnet': 250,
	// 			'a4.testnet': 250,
	// 			'a5.testnet': 250,
	// 			// 'a6.testnet': 250,
	// 			// 'a7.testnet': 250,
	// 		},
	// 	}, GAS, parseNearAmount('1'));

	// 	const price = parseNearAmount('1')
	// 	let sale_conditions = [
	// 		{
	// 			ft_token_id: 'near',
	// 			price 
	// 		}
	// 	];

	// 	await contractAccount.functionCall(contractId, 'nft_approve', {
	// 		token_id,
	// 		account_id: marketId,
	// 		msg: JSON.stringify({ sale_conditions })
	// 	}, GAS, parseNearAmount('0.01'));

	// 	const sale = await contractAccount.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
	// 	console.log('\n\n', sale, '\n\n');
	// 	expect(sale.conditions.near).toEqual(price);
	// });

	// test('token transfer locked - owner unlocks token transfer token type', async () => {
	// 	const token_id = tokenIds[0];
	// 	try {
	// 		await contractAccount.functionCall(contractId, 'nft_transfer', {
	// 			receiver_id: bobId,
	// 			token_id
	// 		}, 1);
	// 		expect(false);
	// 	} catch(e) {
	// 		expect(true);
	// 	}

	// 	// unlock all token types
	// 	const token_types = [
	// 		tokenTypes[0],
	// 		tokenTypes[1],
	// 		tokenTypes[2],
	// 	]
	// 	await contractAccount.functionCall(contractName, 'unlock_token_types', { token_types }, GAS);
	// 	const tokenLocked = await contractAccount.viewFunction(contractName, 'is_token_locked', { token_id });
	// 	expect(tokenLocked).toEqual(false);

	// 	// should be none
	// 	const typesLocked = await contractAccount.viewFunction(contractName, 'get_token_types_locked');
	// 	console.log(typesLocked)
	// 	expect(typesLocked.length).toEqual(1);
	// });

	// test('get sales by owner id', async () => {
	// 	const sales_by_owner_id = await contractAccount.viewFunction(marketId, 'get_sales_by_owner_id', {
	// 		account_id: contractId,
	// 		from_index: '0',
	// 		limit: '50'
	// 	});
	// 	console.log('\n\n', sales_by_owner_id, '\n\n');
	// 	expect(sales_by_owner_id.length).toEqual(1);
	// });

	// test('get sales by nft contract id', async () => {
	// 	const sales_by_nft_contract_id = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_contract_id', {
	// 		nft_contract_id: contractId,
	// 		from_index: '0',
	// 		limit: '50'
	// 	});
	// 	console.log('\n\n', sales_by_nft_contract_id, '\n\n');
	// 	expect(sales_by_nft_contract_id.length > 0).toEqual(true);
	// });

	// test('get sales by nft token type', async () => {
	// 	const sales_by_nft_token_type = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_token_type', {
	// 		token_type: tokenTypes[0],
	// 		from_index: '0',
	// 		limit: '50'
	// 	});
	// 	console.log('\n\n', sales_by_nft_token_type, '\n\n');
	// 	expect(sales_by_nft_token_type.length > 0).toEqual(true);
	// });

	// test('bob purchase nft with NEAR', async () => {
	// 	const token_id = tokenIds[0];
	// 	const contractBalanceBefore = await getAccountBalance(contractId);
	// 	/// purchase = near deposit = sale.price -> nft_transfer -> royalties transfer near
	// 	await bob.functionCall(marketId, 'offer', {
	// 		nft_contract_id: contractName,
	// 		token_id,
	// 	}, GAS, parseNearAmount('1'));
	// 	/// check owner
	// 	const token = await contract.nft_token({ token_id });
	// 	expect(token.owner_id).toEqual(bobId);
	// 	// check contract balance went up by over 80% of 1 N
	// 	const contractBalanceAfter = await getAccountBalance(contractId);
	// 	expect(new BN(contractBalanceAfter.total).sub(new BN(contractBalanceBefore.total)).gt(new BN(parseNearAmount('0.79')))).toEqual(true);
	// });

	// test('contract account registers bob with market contract', async () => {
	// 	await contractAccount.functionCall(marketId, 'storage_deposit', { account_id: bobId }, GAS, storageMarket);
	// 	const result = await contractAccount.viewFunction(marketId, 'storage_paid', { account_id: bobId });
	// 	expect(result).toEqual(parseNearAmount('0.01'));
	// });

	// test('bob withdraws storage', async () => {
	// 	await bob.functionCall(marketId, 'storage_withdraw', {}, GAS, 1);
	// 	const result = await contractAccount.viewFunction(marketId, 'storage_paid', { account_id: bobId });
	// 	expect(result).toEqual('0');
	// });

	// test('bob approves sale with FT and NEAR (fixed prices)', async () => {
	// 	const token_id = tokenIds[0];
	// 	await bob.functionCall(marketId, 'storage_deposit', {}, GAS, storageMarket);
	// 	await bob.functionCall(stableId, 'storage_deposit', {}, GAS, storageMinimum);
	// 	const token = await contract.nft_token({ token_id });
	// 	let sale_conditions = [
	// 		{
	// 			ft_token_id: stableId,
	// 			price: parseNearAmount('25')
	// 		},
	// 		{
	// 			ft_token_id: 'near',
	// 			price: parseNearAmount('5')
	// 		}
	// 	];

	// 	console.log('\n\n sale_conditions.length', sale_conditions.length, '\n\n');
	// 	console.log('\n\n token.royalty.length', token.royalty.length, '\n\n');

	// 	if (sale_conditions.length + token.royalty.length > 8) {
	// 		throw new Error("Cannot have more than 8 royalties + sale collateral at the same time");
	// 	}

	// 	await bob.functionCall(contractId, 'nft_approve', {
	// 		token_id,
	// 		account_id: marketId,
	// 		msg: JSON.stringify({ sale_conditions })
	// 	}, GAS, parseNearAmount('0.01'));
	// 	const sale = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
	// 	console.log('\n\n', sale, '\n\n');
	// 	expect(sale.conditions[stableId]).toEqual(parseNearAmount('25'));
	// });

	// test('enumerable tests', async () => {
	// 	const total_supply = await bob.viewFunction(contractName, 'nft_total_supply', {});
	// 	console.log('\n\n total_supply', total_supply, '\n\n');
	// 	// could be several tests in, with many tokens minted
	// 	const nft_supply_for_owner = await bob.viewFunction(contractName, 'nft_supply_for_owner', { account_id: bobId });
	// 	console.log('\n\n nft_supply_for_owner', nft_supply_for_owner, '\n\n');
	// 	expect(nft_supply_for_owner).toEqual('1');
	// 	const tokens = await bob.viewFunction(contractName, 'nft_tokens', { from_index: '0', limit: '1000' });
	// 	console.log('\n\n tokens', tokens, '\n\n');
	// 	// proxy for total supply with low limits, could be several tests in, with many tokens minted
	// 	expect(tokens.length > 0).toEqual(true);
	// 	const bobTokens = await bob.viewFunction(contractName, 'nft_tokens_for_owner', { account_id: bobId, from_index: '0', limit: '1000' });
	// 	console.log('\n\n bobTokens', bobTokens, '\n\n');
	// 	expect(bobTokens.length).toEqual(1);
	// });
    
	// test('bob changes price of FTs', async () => {
	// 	const token_id = tokenIds[0];
	// 	await bob.functionCall(marketId, 'update_price', {
	// 		nft_contract_id: contractId,
	// 		token_id,
	// 		ft_token_id: stableId,
	// 		price: parseNearAmount('20')
	// 	}, GAS, 1);
	// 	const sale = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
	// 	console.log('\n\n', sale, '\n\n');
	// 	expect(sale.conditions[stableId]).toEqual(parseNearAmount('20'));
	// });

	// test('contract owner makes low bid', async () => {
	// 	const token_id = tokenIds[0];
	// 	/// purchase = ft_transfer_call -> market: ft_on_transfer -> nft_transfer
	// 	await contractAccount.functionCall(marketId, 'offer', {
	// 		nft_contract_id: contractName,
	// 		token_id,            
	// 	}, GAS, parseNearAmount('1'));
		
	// 	/// check sale should have 2 N bid for near from contract owner
	// 	const sale = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
	// 	expect(sale.bids['near'].owner_id).toEqual(contractId);
	// 	expect(sale.bids['near'].price).toEqual(parseNearAmount('1'));
	// });

	// test('alice outbids contract owner', async () => {
	// 	const token_id = tokenIds[0];

	// 	const contractBalanceBefore = await getAccountBalance(contractId);
	// 	/// purchase = ft_transfer_call -> market: ft_on_transfer -> nft_transfer
	// 	await alice.functionCall(marketId, 'offer', {
	// 		nft_contract_id: contractName,
	// 		token_id,
	// 	}, GAS, parseNearAmount('1.1'));
		
	// 	/// check sale should have 1.1 N bid for near from alice
	// 	const sale = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
	// 	expect(sale.bids['near'].owner_id).toEqual(aliceId);
	// 	expect(sale.bids['near'].price).toEqual(parseNearAmount('1.1'));

	// 	// contract owner gets back 1 N - gas > 0.9
	// 	const contractBalanceAfter = await getAccountBalance(contractId);

	// 	expect(new BN(contractBalanceAfter.total).sub(new BN(contractBalanceBefore.total)).gt(new BN(parseNearAmount('0.9')))).toEqual(true);
	// });

	// test('alice gets 100 FTs', async () => {
	// 	await alice.functionCall(stableId, 'storage_deposit', {}, GAS, storageMinimum);
	// 	let amount = parseNearAmount('100');
	// 	await contractAccount.functionCall(stableId, 'ft_transfer', {
	// 		receiver_id: aliceId,
	// 		amount
	// 	}, GAS, 1);
	// 	/// check balance
	// 	const balance = await contractAccount.viewFunction(stableId, 'ft_balance_of', { account_id: aliceId });
	// 	expect(balance).toEqual(amount);
	// });

	// test('contract owner bids with fts', async () => {
	// 	const token_id = tokenIds[0];
	// 	await contractAccount.functionCall(stableId, 'ft_transfer_call', {
	// 		receiver_id: marketId,
	// 		amount: parseNearAmount('10'),
	// 		msg: JSON.stringify({
	// 			nft_contract_id: contractName,
	// 			token_id,
	// 		})
	// 	}, GAS, 1);
	// });

	// test('alice purchase NFT with FT, alice gets NEAR, owner gets FTs back', async () => {
	// 	const token_id = tokenIds[0];
	// 	const marketFTBalance = await contractAccount.viewFunction(stableId, 'ft_balance_of', { account_id: marketId });
	// 	expect(marketFTBalance).toEqual(parseNearAmount('10'));
	// 	const ownerBalanceBefore = await contractAccount.viewFunction(stableId, 'ft_balance_of', { account_id: contractId });
	// 	const aliceBalanceBefore = await getAccountBalance(aliceId);
	// 	/// purchase = ft_transfer_call -> market: ft_on_transfer -> nft_transfer
	// 	await alice.functionCall(stableId, 'ft_transfer_call', {
	// 		receiver_id: marketId,
	// 		amount: parseNearAmount('20'),
	// 		msg: JSON.stringify({
	// 			nft_contract_id: contractName,
	// 			token_id,
	// 		})
	// 	}, GAS, 1);
	// 	/// check owner
	// 	const token = await contract.nft_token({ token_id });
	// 	expect(token.owner_id).toEqual(aliceId);
	// 	/// check token balances
	// 	const aliceBalance = await alice.viewFunction(stableId, 'ft_balance_of', { account_id: aliceId });
	// 	expect(aliceBalance).toEqual(parseNearAmount('80'));
	// 	const marketBalance = await marketAccount.viewFunction(stableId, 'ft_balance_of', { account_id: marketId });
	// 	console.log('\n\n marketBalance', marketBalance, '\n\n');
	// 	/// bob gets 80% of the FTs
	// 	const bobBalance = await bob.viewFunction(stableId, 'ft_balance_of', { account_id: bobId });
	// 	expect(bobBalance).toEqual(parseNearAmount('16'));
	// 	// alice's bid of 1.1 NEAR was returned (check N diff > than 1.1 - gas)
	// 	const ownerBalanceAfter = await contractAccount.viewFunction(stableId, 'ft_balance_of', { account_id: contractId });
	// 	const aliceBalanceAfter = await getAccountBalance(aliceId);
	// 	// NOTE: owner received 5% royalty on NFT purchase
	// 	expect(new BN(ownerBalanceAfter).sub(new BN(ownerBalanceBefore)).toString()).toEqual(parseNearAmount('11'));
	// 	expect(new BN(aliceBalanceAfter.total).sub(new BN(aliceBalanceBefore.total)).gt(new BN(parseNearAmount('1')))).toEqual(true);
	// });

	// /// near bid

	// test('bob fails to mint past hard cap for token type', async () => {
	// 	const token_id = tokenIds[1];
	// 	try {
	// 		await bob.functionCall(contractId, 'nft_mint', {
	// 			token_id,
	// 			metadata,
	// 			token_type: tokenTypes[0]
	// 		}, GAS, parseNearAmount('1'));
	// 		expect(false);
	// 	} catch (e) {
	// 		expect(true);
	// 	}
	// 	const hardCap = await bob.viewFunction(contractId, 'nft_supply_for_type', { token_type: tokenTypes[0] });
	// 	expect(hardCap).toEqual('1');
	// });

	// test('bob: nft mint (no type), approve sale with NEAR open for bids', async () => {
	// 	const token_id = tokenIds[1];
	// 	await bob.functionCall(marketId, 'storage_deposit', {}, GAS, storageMarket);

	// 	/// bob just double paid for storage (check this)
	// 	const result = await contractAccount.viewFunction(marketId, 'storage_paid', { account_id: bobId });
	// 	expect(result).toEqual(parseNearAmount('0.02'));

	// 	await bob.functionCall(contractId, 'nft_mint', {
	// 		token_id,
	// 		metadata: metadata2,
	// 		perpetual_royalties: {
	// 			[bobId]: 500,
	// 		},
	// 	}, GAS, parseNearAmount('1'));
	// 	await bob.functionCall(contractId, 'nft_approve', {
	// 		token_id,
	// 		account_id: marketId,
	// 		msg: JSON.stringify({
	// 			sale_conditions: [{
	// 				ft_token_id: 'near',
	// 			}]
	// 		})
	// 	}, GAS, parseNearAmount('0.01'));
	// 	const sale = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
	// 	console.log('\n\n', sale, '\n\n');
	// 	expect(sale.conditions["near"]).toEqual(parseNearAmount('0'));
	// });

	// test('alice bid with NEAR', async () => {
	// 	const token_id = tokenIds[1];
	// 	await alice.functionCall(marketId, 'offer', {
	// 		nft_contract_id: contractName,
	// 		token_id,
	// 	}, GAS, parseNearAmount('0.2'));
	// 	const sale = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
	// 	expect(sale.bids['near'].owner_id).toEqual(aliceId);
	// 	expect(sale.bids['near'].price).toEqual(parseNearAmount('0.2'));
	// });

	// test('bob accept bid', async () => {
	// 	const token_id = tokenIds[1];
	// 	const bobBalanceBefore = await getAccountBalance(bobId);
	// 	/// purchase = near deposit = sale.price -> nft_transfer -> royalties transfer near
	// 	await bob.functionCall(marketId, 'accept_offer', {
	// 		nft_contract_id: contractName,
	// 		token_id,
	// 		ft_token_id: 'near',
	// 	}, GAS);
	// 	/// check owner
	// 	const token = await contract.nft_token({ token_id });
	// 	expect(token.owner_id).toEqual(aliceId);
	// 	const bobBalanceAfter = await getAccountBalance(bobId);
	// 	/// bob got close to 0.18 N (95% - gas) from this sale
	// 	expect(new BN(bobBalanceAfter.total).sub(new BN(bobBalanceBefore.total)).gt(new BN(parseNearAmount('0.17')))).toEqual(true);
	// });

	// /// for testing frontend

	// test('alice lingering sale in marketplace', async () => {
	// 	const token_id = tokenIds[1];
	// 	await alice.functionCall(marketId, 'storage_deposit', {}, GAS, storageMarket);
	// 	await alice.functionCall(contractId, 'nft_approve', {
	// 		token_id,
	// 		account_id: marketId,
	// 		perpetual_royalties: {
	// 			[aliceId]: 500,
	// 		},
	// 		msg: JSON.stringify({
	// 			sale_conditions: [{
	// 				ft_token_id: 'near',
	// 			}]
	// 		})
	// 	}, GAS, parseNearAmount('0.01'));
	// });

});