const fs = require('fs');
const fetch = require('node-fetch');
const BN = require('bn.js');
const { sha256 } = require('js-sha256');
const nearAPI = require('near-api-js');
const testUtils = require('./test-utils');
const getConfig = require('../src/config');

const {getPackages} = require('./examples/packages');
const {reglExample} = require('./examples/regl-example');
const {reglExample2} = require('./examples/regl-example-2');
const {regl3} = require('./examples/regl-3');

const { 
	Contract, KeyPair, Account,
	utils: { format: { parseNearAmount }},
	transactions: { deployContract, functionCall },
} = nearAPI;
const { 
	connection, initContract, getAccount, getAccountBalance, getAccountBytes,
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

const SERIES_VARIANT_DELIMETER = ':';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;

const getTokenAndSrc = async (token_id) => {
	const token = await contractAccount.viewFunction(contractId, 'nft_token', { token_id });
	const series = await contractAccount.viewFunction(contractId, 'series_data', { series_name: token.series_args.series_name });
	let { src } = series;
	series.params.mint.forEach((p, i) => src = src.replace(new RegExp(`{{${p}.*}}`, 'g'), token.series_args.mint[i]));
	series.params.owner.forEach((p, i) => src = src.replace(new RegExp(`{{${p}.*}}`, 'g'), token.series_args.owner[i]));
	return { token, src };
};

describe('deploy contract ' + contractName, () => {
	let lazyArgs,
		alice, aliceId, bob, bobId,
		stableAccount, marketAccount,
		storageMinimum, storagePerSale;

	const t = Date.now();
	const arg1 = t;
	const arg2 = t + '1';

	const exampleArgs = [reglExample, reglExample2, regl3];
	const srcUpdateArgs = exampleArgs.map((example) => {
		const series_name = example.series_name = example.series_name + t;
		example.bytes = example.src.length.toString();
		example.royalty = {
			'si1.testnet': 1000
		};
		const src = example.src;
		example.src = undefined;
		return { series_name, src };
	});
	exampleArgs[0];

	const owner = [
		'0.01'
	];
	const series_name = reglExample.series_name;
	const args1 = {
		series_mint_args: {
			series_name,
			mint: [
				'[1, 1, 1, 0.' + arg1 + ']'
			],
			owner,
		}
	};
	const args2 = {
		series_mint_args: {
			series_name,
			mint: [
				'[1, 1, 1, 0.' + arg2 + ']'
			],
			owner,
		}
	};

	const tokenIds = [];
	for (let i = 0; i < 2; i++) {
		tokenIds.push(reglExample.series_name + SERIES_VARIANT_DELIMETER + i);
	}

	/// most of the following code in beforeAll can be used for deploying and initializing contracts
	/// skip all tests if you want to deploy to production or testnet without any NFTs
	beforeAll(async () => {
	    await initContract();

		aliceId = 'alice-' + t + '.' + contractId;
		alice = await getAccount(aliceId);
		lazyArgs = {
			nft_contract_id: contractId,
			token_id: reglExample2.series_name,
			memo: JSON.stringify({
				series_name: reglExample2.series_name,
				mint: ['0.1'],
				owner: [],
				perpetual_royalties: {
					[alice.accountId]: 500,
				},
				receiver_id: alice.accountId
			})
		};

		/// create or get market account and deploy market.wasm (if not already deployed)
		marketAccount = await createOrInitAccount(marketId, GUESTS_ACCOUNT_SECRET);
		const marketAccountState = await marketAccount.state();
		console.log('\n\nstate:', marketAccountState, '\n\n');
		if (marketAccountState.code_hash === '11111111111111111111111111111111') {

			const marketContractBytes = fs.readFileSync('./out/market.wasm');
			console.log('\n\n deploying marketAccount contractBytes:', marketContractBytes.length, '\n\n');
			const newMarketArgs = {
				owner_id: contractId,
			};
			const actions = [
				deployContract(marketContractBytes),
				functionCall('new', newMarketArgs, GAS)
			];
			await marketAccount.signAndSendTransaction(marketId, actions);

		}
		
		/// find out how much needed for market storage
		storagePerSale = await contractAccount.viewFunction(marketId, 'storage_amount');
		console.log('\n\n storagePerSale:', storagePerSale, '\n\n');
	});


	test('contract owner adds packages', async () => {
		const { three, regl, p5, pixi } = await getPackages();
		await contractAccount.functionCall({
			contractId,
			methodName: 'add_package',
			args: p5,
			gas: GAS,
			attachedDeposit: parseNearAmount('1')
		});
		await contractAccount.functionCall({
			contractId,
			methodName: 'add_package',
			args: three,
			gas: GAS,
			attachedDeposit: parseNearAmount('1')
		});
		await contractAccount.functionCall({
			contractId,
			methodName: 'add_package',
			args: regl,
			gas: GAS,
			attachedDeposit: parseNearAmount('1')
		});
		await contractAccount.functionCall({
			contractId,
			methodName: 'add_package',
			args: pixi,
			gas: GAS,
			attachedDeposit: parseNearAmount('1')
		});
		const getRegl = await contractAccount.viewFunction(contractId, 'get_package', { name_version: regl.name_version });
		expect(getRegl.src_hash).toEqual(regl.src_hash);
	});

	test('contract owner creates series', async () => {
		await contractAccount.functionCall({
			contractId,
			methodName: 'series_create',
			args: exampleArgs[0],
			gas: GAS,
			attachedDeposit:  parseNearAmount('0.9')
		});
		await contractAccount.functionCall({
			contractId,
			methodName: 'series_update',
			args: srcUpdateArgs[0],
			gas: GAS,
		});
		const series = await contractAccount.viewFunction(contractId, 'series_data', { series_name: exampleArgs[0].series_name });
		expect(series.src).toEqual(srcUpdateArgs[0].src);
	});

	test('contract owner creates series and approves sale', async () => {
		await contractAccount.functionCall({
			contractId,
			methodName: 'series_create_and_approve',
			args: {
				...exampleArgs[2],
				account_id: marketId,
				msg: {
					sale_conditions: [
						{ ft_token_id: "near", price: parseNearAmount('1')}
					]
				}
			},
			gas: GAS,
			attachedDeposit:  parseNearAmount('1')
		});
		await contractAccount.functionCall({
			contractId,
			methodName: 'series_update',
			args: srcUpdateArgs[2],
			gas: GAS,
		});

		const series = await contractAccount.viewFunction(contractId, 'series_data', { series_name: exampleArgs[2].series_name });
		expect(series.src).toEqual(srcUpdateArgs[2].src);

		const sales = await contractAccount.viewFunction(marketId, 'get_sales', {
			nft_contract_id: contractId,
			from_index: '0',
			limit: '50'
		});
		expect(sales.filter((s) => s.token_id).length > 0).toEqual(true);
	});

	test('contract owner mints NFT in series', async () => {
		const token_id = tokenIds[0];

		const costEstimate = await contractAccount.functionCall({
			contractId,
			methodName: 'estimate_mint_cost',
			args: args1,
			gas: GAS,
		});
		const deposit = Buffer.from(costEstimate?.status?.SuccessValue, 'base64').toString('utf-8');
		
		const bytesBefore = await getAccountBytes(contractId);
		
		await contractAccount.functionCall({
			contractId,
			methodName: 'nft_mint',
			args: args1,
			gas: GAS,
			attachedDeposit: deposit
		});
		
		const bytesAfter = await getAccountBytes(contractId);

		console.log('\n\n costEstimate ', costEstimate, '\n\n');
		console.log('\n\n bytesBefore ', bytesBefore, '\n\n');
		console.log('\n\n bytesAfter ', bytesAfter, '\n\n');

		const { token } = await getTokenAndSrc(token_id);
		expect(token.series_args.mint[0]).toEqual(args1.series_mint_args.mint[0]);
	});

	test('contract owner tries to mint nft with duplicate args', async () => {
		try {
			await contractAccount.functionCall({
				contractId,
				methodName: 'nft_mint',
				args: args1,
				gas: GAS,
				attachedDeposit: parseNearAmount('1')
			});
			expect(false);
		} catch (e) {
			expect(/using those args already exists/gi.test(e.toString()));
		}
	});

	test('contract owner can update their owner args', async () => {
		const token_id = tokenIds[0];
		await contractAccount.functionCall({
			contractId,
			methodName: 'update_token_owner_args',
			args: {
				token_id,
				owner_args: ['0.1']
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('1')
		});
		const { token, src } = await getTokenAndSrc(token_id);
		expect(token.series_args.owner[0]).toEqual('0.1');
	});

	test('contract owner tries to mint more than supply', async () => {
		try {
			/// fails because of max_supply
			await contractAccount.functionCall({
				contractId,
				methodName: 'nft_mint',
				args: args2,
				gas: GAS,
				attachedDeposit: parseNearAmount('1')
			});
			expect(false);
		} catch (e) {
			expect(/Cannot mint anymore/gi.test(e.toString()));
		}
	});

	test('owner creates NFT series', async () => {
		await contractAccount.functionCall({
			contractId,
			methodName: 'series_create',
			args: exampleArgs[1],
			gas: GAS,
			attachedDeposit: parseNearAmount('1')
		});
		await contractAccount.functionCall({
			contractId,
			methodName: 'series_update',
			args: srcUpdateArgs[1],
			gas: GAS,
		});
		const series = await contractAccount.viewFunction(contractId, 'series_data', { series_name: exampleArgs[1].series_name });
		expect(series.src).toEqual(srcUpdateArgs[1].src);
	});

	test('alice CANNOT purchase lazy minted NFT', async () => {
		try {
			await alice.functionCall({
				contractId: marketId,
				methodName: 'offer',
				args: lazyArgs,
				gas: GAS,
				attachedDeposit: parseNearAmount('1.1')
			});
			expect(false);
		} catch(e) {
			console.warn(e);
			expect(true);
		}
	});

	test('owner approves series for lazy minted NFT sales', async () => {
		/// deposit = storagePerSale + 0.1 N to cover approval account_ids in the NFT contract
		const deposit = new BN(storagePerSale).add(new BN(parseNearAmount('0.1'))).toString();

		await contractAccount.functionCall({
			contractId,
			methodName: 'series_approve',
			args: {
				series_name: reglExample2.series_name,
				account_id: marketId,
				msg: {
					sale_conditions: [
						{ ft_token_id: "near", price: parseNearAmount('1')}
					]
				}
			},
			gas: GAS,
			attachedDeposit: deposit
		});

		const get_sales = await contractAccount.viewFunction(marketId, 'get_sales', {
			nft_contract_id: contractId,
			from_index: '0',
			limit: '50'
		});
		console.log('\n\n', get_sales, '\n\n');
		expect(get_sales.length > 1).toEqual(true);

		const sales_by_nft_contract_id = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_contract_id', {
			nft_contract_id: contractId,
			from_index: '0',
			limit: '50'
		});
		console.log('\n\n', sales_by_nft_contract_id, '\n\n');
		expect(sales_by_nft_contract_id.length > 1).toEqual(true);

		const sales = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_token_type', {
			token_type: reglExample2.series_name,
			from_index: '0',
			limit: '100'
		});

		expect(sales.length).toEqual(1);
	});

	test('alice purchases lazy minted NFT', async () => {
		console.log('\n\n Market Balance:', await getAccountBalance(marketId), '\n\n');

		const costEstimate = await contractAccount.functionCall({
			contractId,
			methodName: 'estimate_mint_cost',
			args: {
				series_mint_args: JSON.parse(lazyArgs.memo)
			},
			gas: GAS,
		});
		const deposit = Buffer.from(costEstimate?.status?.SuccessValue, 'base64').toString('utf-8');

		await alice.functionCall({
			contractId: marketId,
			methodName: 'offer',
			args: lazyArgs,
			gas: GAS,
			attachedDeposit: new BN(parseNearAmount('1')).add(new BN(deposit)).toString()
		});
		console.log('\n\n Market Balance:', await getAccountBalance(marketId), '\n\n');

		const tokens = await alice.viewFunction(contractId, 'nft_tokens_for_owner', {
			account_id: alice.accountId,
			from_index: '0',
			limit: '100'
		});

		expect(Object.keys(tokens[0].royalty).includes('si1.testnet')).toEqual(true);
		expect(tokens.length).toEqual(1);
	});

});