
import { contractId, marketId, GAS, parseNearAmount } from '../state/near';
import { setDialog, getPrice } from '../state/app';

export const makeOffer = (account, item, price) => async ({ dispatch }) => {
    if (!account) {
        return alert('Must sign in with NEAR Wallet to purchase');
    }
    const { token_id } = item;

    if (price === '0') {
        const userPrice = await dispatch(getPrice('Make a Bid'))
        price = parseNearAmount(userPrice);
    }

    await account.functionCall(marketId, 'offer', {
        nft_contract_id: contractId,
        token_id,
    }, GAS, price);
};

export const acceptOffer = (account, item, price) => async ({ dispatch }) => {
    const { token_id } = item

    if ((await dispatch(setDialog({
            msg: `Sell ${token_id} for ${price}?`,
            choices: ['Yes', 'No'],
            noClose: true,
        }))) == 'No') {
        return
    }
    await account.functionCall({
        contractId: marketId,
        methodName: 'accept_offer',
        args: {
            nft_contract_id: contractId,
            token_id,
            ft_token_id: 'near'
        },
        gas: GAS,
        attachedDeposit: 1,
    });
};