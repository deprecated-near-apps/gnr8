const fs = require('fs');

const nearAPI = require('near-api-js');
const {
    utils: { format: { parseNearAmount } }
} = nearAPI
const {
    contractAccount
} = require('../test/near-utils');
const getConfig = require('../src/config');
const {
    GAS
} = getConfig();
const {getPackages} = require('../test/examples/packages');

const { accountId: contractId } = contractAccount
const init = async () => {
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
}

init()