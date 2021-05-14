use crate::*;
use near_sdk::promise_result_as_success;

/// measuring how many royalties can be paid
const GAS_FOR_FT_TRANSFER: Gas = 5_000_000_000_000;
/// seems to be max Tgas can attach to resolve_purchase
const GAS_FOR_ROYALTIES: Gas = 120_000_000_000_000;
const GAS_FOR_NFT_TRANSFER: Gas = 20_000_000_000_000;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Bid {
    pub owner_id: AccountId,
    pub price: U128,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Sale {
    pub owner_id: AccountId,
    pub approval_id: U64,
    pub token_type: Option<String>,
    pub conditions: HashMap<FungibleTokenId, U128>,
    pub bids: HashMap<FungibleTokenId, Bid>,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Price {
    pub ft_token_id: ValidAccountId,
    pub price: Option<U128>,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct PurchaseArgs {
    pub nft_contract_id: ValidAccountId,
    pub token_id: TokenId,
}

#[near_bindgen]
impl Contract {
    /// for add sale see: nft_callbacks.rs
    
    pub fn add_sale_batch(
        &mut self,
        token_ids: Vec<TokenId>,
        nft_contract_id: ValidAccountId,
        approval_ids: Vec<U64>,
        msg: String,
    ) {
        let owner_id = env::predecessor_account_id();
        let owner_paid_storage = self.storage_deposits.get(&owner_id).unwrap_or(0);
        assert!(
            owner_paid_storage >= STORAGE_PER_SALE,
            "Required minimum storage to sell on market: {}",
            STORAGE_PER_SALE
        );

        let SaleArgs { sale_conditions, token_type } =
            near_sdk::serde_json::from_str(&msg).expect("Not valid SaleArgs");

        let mut conditions = HashMap::new();

        for Price { price, ft_token_id } in sale_conditions {
            if !self.ft_token_ids.contains(ft_token_id.as_ref()) {
                env::panic(
                    format!("Token {} not supported by this market", ft_token_id).as_bytes(),
                );
            }
            // sale is denominated in FT or 0 if accepting bids
            conditions.insert(ft_token_id.into(), price.unwrap_or(U128(0)));
        }

        // env::log(format!("add_sale for owner: {}", &owner_id).as_bytes());

        for i in 0..token_ids.len() {
            let token_id = &token_ids[i];
            let approval_id = approval_ids[i];
            let contract_and_token_id = format!("{}{}{}", nft_contract_id, DELIMETER, token_id);
            let bids = HashMap::new();
            
            self.sales.insert(
                &contract_and_token_id,
                &Sale {
                    owner_id: owner_id.clone(),
                    approval_id,
                    token_type: token_type.clone(),
                    conditions: conditions.clone(),
                    bids,
                },
            );

            // extra for views

            let mut by_owner_id = self.by_owner_id.get(&owner_id).unwrap_or_else(|| {
                UnorderedSet::new(
                    StorageKey::ByOwnerIdInner {
                        account_id_hash: hash_account_id(&owner_id),
                    }
                    .try_to_vec()
                    .unwrap(),
                )
            });

            let owner_occupied_storage = u128::from(by_owner_id.len()) * STORAGE_PER_SALE;
            assert!(
                owner_paid_storage > owner_occupied_storage,
                "User has more sales than storage paid"
            );
            by_owner_id.insert(&contract_and_token_id);
            self.by_owner_id.insert(&owner_id, &by_owner_id);

            let mut by_nft_contract_id = self
                .by_nft_contract_id
                .get(nft_contract_id.as_ref())
                .unwrap_or_else(|| {
                    UnorderedSet::new(
                        StorageKey::ByNFTContractIdInner {
                            account_id_hash: hash_account_id(nft_contract_id.as_ref()),
                        }
                        .try_to_vec()
                        .unwrap(),
                    )
                });
            by_nft_contract_id.insert(&token_id);
            self.by_nft_contract_id
                .insert(nft_contract_id.as_ref(), &by_nft_contract_id);

            let current_token_type = token_type.clone();
            if let Some(current_token_type) = current_token_type {
                assert!(token_id.contains(&current_token_type), "TokenType should be substr of TokenId");
                let mut by_nft_token_type = self
                    .by_nft_token_type
                    .get(&current_token_type)
                    .unwrap_or_else(|| {
                        UnorderedSet::new(
                            StorageKey::ByNFTTokenTypeInner {
                                token_type_hash: hash_account_id(&current_token_type),
                            }
                            .try_to_vec()
                            .unwrap(),
                        )
                    });
                    by_nft_token_type.insert(&contract_and_token_id);
                self.by_nft_token_type
                    .insert(&current_token_type, &by_nft_token_type);
            }
        }
    }

    /// TODO remove without redirect to wallet? panic reverts
    #[payable]
    pub fn remove_sale(&mut self, nft_contract_id: ValidAccountId, token_id: String) {
        assert_one_yocto();
        let sale = self.internal_remove_sale(nft_contract_id.into(), token_id);
        let owner_id = env::predecessor_account_id();
        assert_eq!(owner_id, sale.owner_id, "Must be sale owner");
        self.refund_bids(&sale.bids);
    }

    #[payable]
    pub fn update_price(
        &mut self,
        nft_contract_id: ValidAccountId,
        token_id: String,
        ft_token_id: ValidAccountId,
        price: U128,
    ) {
        assert_one_yocto();
        let contract_id: AccountId = nft_contract_id.into();
        let contract_and_token_id = format!("{}{}{}", contract_id, DELIMETER, token_id);
        let mut sale = self.sales.get(&contract_and_token_id).expect("No sale");
        assert_eq!(
            env::predecessor_account_id(),
            sale.owner_id,
            "Must be sale owner"
        );
        if !self.ft_token_ids.contains(ft_token_id.as_ref()) {
            env::panic(format!("Token {} not supported by this market", ft_token_id).as_bytes());
        }
        sale.conditions.insert(ft_token_id.into(), price);
        self.sales.insert(&contract_and_token_id, &sale);
    }

    #[payable]
    pub fn offer(&mut self, nft_contract_id: ValidAccountId, token_id: String, memo: Option<String>) {
        let contract_id: AccountId = nft_contract_id.into();
        let contract_and_token_id = format!("{}{}{}", contract_id, DELIMETER, token_id);
        let mut sale = self.sales.get(&contract_and_token_id).expect("No sale");
        let buyer_id = env::predecessor_account_id();
        assert_ne!(sale.owner_id, buyer_id, "Cannot bid on your own sale.");
        let ft_token_id = "near".to_string();
        let price = sale
            .conditions
            .get(&ft_token_id)
            .expect("Not for sale in NEAR")
            .0;

        let deposit = env::attached_deposit();
        assert!(deposit > 0, "Attached deposit must be greater than 0");

        // there's a fixed price user can buy for
        if deposit == price {
            self.process_purchase(
                contract_id,
                token_id,
                ft_token_id,
                memo,
                U128(deposit),
                buyer_id,
            );
        } else {
            self.add_bid(
                contract_and_token_id,
                price,
                deposit,
                ft_token_id,
                buyer_id,
                &mut sale,
            )
        }
    }

    #[private]
    pub fn add_bid(
        &mut self,
        contract_and_token_id: ContractAndTokenId,
        price: Balance,
        amount: Balance,
        ft_token_id: AccountId,
        buyer_id: AccountId,
        sale: &mut Sale,
    ) {
        assert!(price == 0 || amount < price, "Paid more {} than price {}", amount, price);
        // store a bid and refund any current bid lower
        let new_bid = Bid {
            owner_id: buyer_id,
            price: U128(amount),
        };
        let current_bid = sale.bids.get(&ft_token_id);
        if let Some(current_bid) = current_bid {
            // refund current bid holder
            let current_price: u128 = current_bid.price.into();
            assert!(
                amount > current_price,
                "Can't pay less than or equal to current bid price: {}",
                current_price
            );
            Promise::new(current_bid.owner_id.clone()).transfer(current_bid.price.into());
            sale.bids.insert(ft_token_id, new_bid);
        } else {
            sale.bids.insert(ft_token_id, new_bid);
        }
        self.sales.insert(&contract_and_token_id, &sale);
    }

    pub fn accept_offer(
        &mut self,
        nft_contract_id: ValidAccountId,
        token_id: String,
        ft_token_id: ValidAccountId,
    ) {
        let contract_id: AccountId = nft_contract_id.into();
        let contract_and_token_id = format!("{}{}{}", contract_id.clone(), DELIMETER, token_id.clone());
        // remove bid before proceeding to process purchase
        let mut sale = self.sales.get(&contract_and_token_id).expect("No sale");
        let bid = sale.bids.remove(ft_token_id.as_ref()).expect("No bid");
        self.sales.insert(&contract_and_token_id, &sale);
        // panics at `self.internal_remove_sale` and reverts above if predecessor is not sale.owner_id
        self.process_purchase(
            contract_id,
            token_id,
            ft_token_id.into(),
            None,
            bid.price.clone(),
            bid.owner_id.clone(),
        );
    }

    #[private]
    pub fn process_purchase(
        &mut self,
        nft_contract_id: AccountId,
        token_id: String,
        ft_token_id: AccountId,
        memo: Option<String>,
        price: U128,
        buyer_id: AccountId,
    ) -> Promise {
        let sale = self.internal_remove_sale(nft_contract_id.clone(), token_id.clone());

        ext_contract::nft_transfer_payout(
            buyer_id.clone(),
            token_id,
            sale.approval_id,
            memo,
            price,
            &nft_contract_id,
            1,
            GAS_FOR_NFT_TRANSFER,
        )
        .then(ext_self::resolve_purchase(
            ft_token_id,
            buyer_id,
            sale,
            price,
            &env::current_account_id(),
            NO_DEPOSIT,
            GAS_FOR_ROYALTIES,
        ))
    }

    /// self callback

    #[private]
    pub fn resolve_purchase(
        &mut self,
        ft_token_id: AccountId,
        buyer_id: AccountId,
        sale: Sale,
        price: U128,
    ) -> U128 {

        // checking for payout information
        let payout_option = promise_result_as_success().and_then(|value| {
            // None means a bad payout from bad NFT contract
            near_sdk::serde_json::from_slice::<Payout>(&value)
                .ok()
                .and_then(|payout| {
                    // gas to do 10 FT transfers (and definitely 10 NEAR transfers)
                    if payout.len() + sale.bids.len() > 10 || payout.is_empty() {
                        env::log(format!("Cannot have more than 10 royalties and sale.bids refunds").as_bytes());
                        None
                    } else {
                        // TODO off by 1 e.g. payouts are fractions of 3333 + 3333 + 3333
                        let mut remainder = price.0;
                        for &value in payout.values() {
                            remainder = remainder.checked_sub(value.0)?;
                        }
                        if remainder == 0 || remainder == 1 {
                            Some(payout)
                        } else {
                            None
                        }
                    }
                })
        });
        // is payout option valid?
        let payout = if let Some(payout_option) = payout_option {
            payout_option
        } else {
            if ft_token_id == "near" {
                Promise::new(buyer_id).transfer(u128::from(price));
            }
            // leave function and return all FTs in ft_resolve_transfer
            return price;
        };
        // Goint to payout everyone, first return all outstanding bids (accepted offer bid was already removed)
        self.refund_bids(&sale.bids);

        // NEAR payouts
        if ft_token_id == "near" {
            for (receiver_id, amount) in payout {
                Promise::new(receiver_id).transfer(amount.0);
            }
            // refund all FTs (won't be any)
            price
        } else {
            // FT payouts
            for (receiver_id, amount) in payout {
                ext_contract::ft_transfer(
                    receiver_id,
                    amount,
                    None,
                    &ft_token_id,
                    1,
                    GAS_FOR_FT_TRANSFER,
                );
            }
            // keep all FTs (already transferred for payouts)
            U128(0)
        }
    }

    fn refund_bids(
        &mut self,
        bids: &HashMap<FungibleTokenId, Bid>,
    ) {
        for (bid_ft, bid) in bids {
            if bid_ft == "near" {
                Promise::new(bid.owner_id.clone()).transfer(u128::from(bid.price));
            } else {
                ext_contract::ft_transfer(
                    bid.owner_id.clone(),
                    bid.price,
                    None,
                    bid_ft,
                    1,
                    GAS_FOR_FT_TRANSFER,
                );
            }
        }
    }
}

/// self call

#[ext_contract(ext_self)]
trait ExtSelf {
    fn resolve_purchase(
        &mut self,
        ft_token_id: AccountId,
        buyer_id: AccountId,
        sale: Sale,
        price: U128,
    ) -> Promise;
}
