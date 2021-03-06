use crate::*;

/// approval callbacks from NFT Contracts

trait NonFungibleTokenApprovalsReceiver {
    fn nft_on_approve(
        &mut self,
        token_id: TokenId,
        owner_id: ValidAccountId,
        approval_id: U64,
        msg: String,
    );
}

#[near_bindgen]
impl NonFungibleTokenApprovalsReceiver for Contract {
    #[payable]
    fn nft_on_approve(
        &mut self,
        token_id: TokenId,
        owner_id: ValidAccountId,
        approval_id: U64,
        msg: String,
    ) {
        self.check_valid_callback(owner_id.clone());

        let nft_contract_id = env::predecessor_account_id();

        let SaleArgs {
            sale_conditions,
            token_type
        } = near_sdk::serde_json::from_str(&msg).expect("Not valid SaleArgs");

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

        // log!("add_sale for owner: {}", &owner_id);

        let contract_and_token_id = format!("{}{}{}", nft_contract_id, DELIMETER, token_id);
        self.sales.insert(
            &contract_and_token_id,
            &Sale {
                owner_id: owner_id.clone().into(),
                created_at: env::block_timestamp().into(),
                approval_id,
                nft_contract_id: nft_contract_id.clone(),
                token_id: token_id.clone(),
                conditions,
                is_series: None,
                token_type: token_type.clone(),
                bids: None,
            },
        );

        // extra for views

        let mut by_owner_id = self.by_owner_id.get(owner_id.as_ref()).unwrap_or_else(|| {
            UnorderedSet::new(StorageKey::ByOwnerIdInner {
                account_id_hash: hash_account_id(owner_id.as_ref()),
            })
        });
        by_owner_id.insert(&contract_and_token_id);
        self.by_owner_id.insert(owner_id.as_ref(), &by_owner_id);

        let mut by_nft_contract_id = self
            .by_nft_contract_id
            .get(&nft_contract_id)
            .unwrap_or_else(|| {
                UnorderedSet::new(StorageKey::ByNFTContractIdInner {
                    account_id_hash: hash_account_id(&nft_contract_id),
                })
            });
        by_nft_contract_id.insert(&contract_and_token_id);
        self.by_nft_contract_id
            .insert(&nft_contract_id, &by_nft_contract_id);

        if let Some(token_type) = token_type {
            assert!(
                token_id.contains(&token_type),
                "TokenType should be substr of TokenId"
            );
            let mut by_nft_token_type =
                self.by_nft_token_type.get(&token_type).unwrap_or_else(|| {
                    UnorderedSet::new(
                        StorageKey::ByNFTTokenTypeInner {
                            token_type_hash: hash_account_id(&token_type),
                        }
                    )
                });
            by_nft_token_type.insert(&contract_and_token_id);
            self.by_nft_token_type
                .insert(&token_type, &by_nft_token_type);
        }
    }
}

trait NonFungibleSeriesApprovalReceiver {
    fn series_on_approve(&mut self, series_name: String, owner_id: ValidAccountId, msg: String);
}

#[near_bindgen]
impl NonFungibleSeriesApprovalReceiver for Contract {
    #[payable]
    fn series_on_approve(&mut self, series_name: String, owner_id: ValidAccountId, msg: String) {
        self.check_valid_callback(owner_id.clone());

        let nft_contract_id = env::predecessor_account_id();

        let SaleArgs {
            sale_conditions,
            token_type: _,
        } = near_sdk::serde_json::from_str(&msg).expect("Not valid SaleArgs");

        let mut conditions = HashMap::new();
        for Price { price, ft_token_id } in sale_conditions {
            if !self.ft_token_ids.contains(ft_token_id.as_ref()) {
                env::panic(
                    format!("Token {} not supported by this market", ft_token_id).as_bytes(),
                );
            }
            conditions.insert(ft_token_id.into(), price.unwrap_or(U128(0)));
        }

        // log!("add_sale for owner: {}", &owner_id);

        let contract_and_token_id = format!("{}{}{}", nft_contract_id, DELIMETER, series_name);
        self.sales.insert(
            &contract_and_token_id,
            &Sale {
                owner_id: owner_id.clone().into(),
                created_at: env::block_timestamp().into(),
                approval_id: U64(0),
                nft_contract_id: nft_contract_id.clone(),
                token_id: series_name.clone(),
                conditions,
                is_series: Some(true),
                token_type: None,
                bids: None,
            },
        );

        // extra for views

        let mut by_owner_id = self.by_owner_id.get(owner_id.as_ref()).unwrap_or_else(|| {
            UnorderedSet::new(
                StorageKey::ByOwnerIdInner {
                    account_id_hash: hash_account_id(owner_id.as_ref()),
                }
            )
        });

        by_owner_id.insert(&contract_and_token_id);
        self.by_owner_id.insert(owner_id.as_ref(), &by_owner_id);

        let mut by_nft_contract_id = self
            .by_nft_contract_id
            .get(&nft_contract_id)
            .unwrap_or_else(|| {
                UnorderedSet::new(
                    StorageKey::ByNFTContractIdInner {
                        account_id_hash: hash_account_id(&nft_contract_id),
                    }
                )
            });
        by_nft_contract_id.insert(&contract_and_token_id);
        self.by_nft_contract_id
            .insert(&nft_contract_id, &by_nft_contract_id);

        let mut by_nft_token_type = self.by_nft_token_type.get(&series_name).unwrap_or_else(|| {
            UnorderedSet::new(
                StorageKey::ByNFTTokenTypeInner {
                    token_type_hash: hash_account_id(&series_name),
                }
            )
        });
        by_nft_token_type.insert(&contract_and_token_id);
        self.by_nft_token_type
            .insert(&series_name, &by_nft_token_type);
    }

}

#[near_bindgen]
impl Contract {

    #[private]
    pub fn check_valid_callback(&mut self, owner_id: ValidAccountId) {

        // enforce cross contract calls and owner_id is signer

        let nft_contract_id = env::predecessor_account_id();
        let signer_id = env::signer_account_id();
        assert_ne!(
            nft_contract_id,
            signer_id,
            "nft_on_approve should only be called via cross-contract call"
        );
        assert_eq!(
            owner_id.as_ref(),
            &signer_id,
            "owner_id should be signer_id"
        );

        // pay storage for 1 sale listing with attached deposit and refund the rest

        let storage_amount = self.storage_amount().0;
        self.storage_deposit(Some(owner_id.clone()), Some(storage_amount));
        let refund = env::attached_deposit().saturating_sub(storage_amount);
        if refund > 1 {
            Promise::new(owner_id.clone().into()).transfer(refund);
        }

        // enforce owner's storage is enough to cover + 1 more sale 

        let owner_paid_storage = self.storage_deposits.get(owner_id.as_ref()).unwrap_or(0);
        let signer_storage_required = (self.get_supply_by_owner_id(owner_id.into()).0 + 1) as u128 * storage_amount;
        assert!(
            owner_paid_storage >= signer_storage_required,
            "Insufficient storage paid: {}, for {} sales at {} rate of per sale",
            owner_paid_storage, signer_storage_required / STORAGE_PER_SALE, STORAGE_PER_SALE
        );
    }
}
