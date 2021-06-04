const fs = require('fs');

const nearAPI = require('near-api-js');
const { 
	transactions: { deployContract, functionCall },
} = nearAPI;

const {
    credentials, contractAccount
} = require('../test/near-utils');
const {
    initContract, createOrInitAccount
} = require('../test/test-utils');
const getConfig = require('../src/config');
const {
    GAS
} = getConfig();

if (!process.env.DEPLOY_ACCOUNT) {
    console.log('set DEPLOY_ACCOUNT')
    process.exit(1)
}

/// WARNING THIS WILL RE-DEPLOY CONTRACT BYTES OVER EXISTING DEPLOYMENTS!

const { accountId: contractId } = contractAccount
const init = async () => {

    console.log('\n\n Deploying NFT Contract', contractId, '\n\n');

    const contractBytes = fs.readFileSync('./out/main.wasm');
    console.log('\n\n deploying marketAccount contractBytes:', contractBytes.length, '\n\n');
    const newArgs = {
        owner_id: contractId,
        metadata: {
            spec: 'nft-1',
            name: 'GNR8 NFTs',
            symbol: 'GNR8',
        },
    };
    const actions = [
        deployContract(contractBytes),
    ];
    const contractState = await contractAccount.state();
    if (contractState.code_hash === '11111111111111111111111111111111') {
        actions.push(functionCall('new', newArgs, GAS))
    }
    await contractAccount.signAndSendTransaction({
        receiverId: contractId,
        actions
    });


    const marketId = 'market.' + contractId

    console.log('\n\n Deploying Market Contract', marketId, '\n\n');
 
    const marketAccount = await createOrInitAccount(marketId, credentials.private_key);
    const marketContractBytes = fs.readFileSync('./out/market.wasm');
    console.log('\n\n deploying marketAccount contractBytes:', marketContractBytes.length, '\n\n');
    const newMarketArgs = {
        owner_id: contractId,
    };
    const actionsMarket = [
        deployContract(marketContractBytes),
    ];
    const marketAccountState = await marketAccount.state();
    if (marketAccountState.code_hash === '11111111111111111111111111111111') {
        actionsMarket.push(functionCall('new', newMarketArgs, GAS))
    }
    await marketAccount.signAndSendTransaction({
        receiverId: marketId,
        actions: actionsMarket
    });
}

init()
