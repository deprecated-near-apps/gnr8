use crate::*;

#[near_bindgen]
impl Contract {

    /// CUSTOM pre-mint a batch of a series with a special token_id so creator can put it up for sale
    #[payable]
    pub fn nft_mint_batch(
        &mut self,
        series_name: String,
        limit: U64,
        perpetual_royalties: Option<HashMap<AccountId, u32>>,
    ) {
        let initial_storage_usage = env::storage_usage();
        let owner_id = env::predecessor_account_id();

        // check series
        let series = self.series_by_name.get(&series_name).unwrap_or_else(|| panic!("No series {}", series_name));
        assert!(series.owner_id == owner_id, "Only series owner");
        let mut tokens_per_series = self.tokens_per_series
            .get(&series_name)
            .unwrap_or_else(|| {
                UnorderedSet::new(
                    StorageKey::TokenPerSeriesInner {
                        series_name_hash: hash_account_id(&series_name),
                    }
                    .try_to_vec()
                    .unwrap(),
                )
            });
        // check creator is not trying to mint more than max_supply
        let token_supply = tokens_per_series.len();
        let new_total_supply =  token_supply + limit.0;
        assert!(new_total_supply <= series.params.max_supply.0, "Cannot mint anymore of series: {}", series_name);
        
        // create royalty map
        let mut royalty = HashMap::new();
        let mut total_perpetual = 0;
        // user added perpetual_royalties (percentage paid with every transfer)
        if let Some(perpetual_royalties) = perpetual_royalties {
            assert!(perpetual_royalties.len() < 7, "Cannot add more than 6 perpetual royalty amounts");
            for (account, amount) in perpetual_royalties {
                royalty.insert(account, amount);
                total_perpetual += amount;
            }
        }
        // royalty limit for minter capped at 20%
        assert!(total_perpetual <= MINTER_ROYALTY_CAP, "Perpetual royalties cannot be more than 20%");
        
        // get all packages we need to token_ids
        let mut packages = vec![];
        for package in &series.params.packages {
            packages.push(self.tokens_per_package
                .get(&package)
                .unwrap_or_else(|| {
                    UnorderedSet::new(
                        StorageKey::TokenPerPackageInner {
                            package_name_version_hash: hash_account_id(&package),
                        }
                        .try_to_vec()
                        .unwrap(),
                    )
                }));
        }

        let series_args = SeriesArgs {
            name: series_name.clone(),
            mint: vec![],
            owner: vec![],
        };
        // create tokens
        for i in token_supply..new_total_supply {
            let token_id = get_token_id(&series_name, i);
            tokens_per_series.insert(&token_id);
            self.tokens_per_series.insert(&series_name, &tokens_per_series);
            // insert token_ids
            for package in &mut packages {
                package.insert(&token_id);
            }

            // insert token like normal
            let token = Token {
                owner_id: owner_id.clone(),
                approved_account_ids: Default::default(),
                next_approval_id: 0,
                royalty: royalty.clone(),
                series_args: series_args.clone(),
                issued_at: env::block_timestamp().into()
            };
            assert!(
                self.tokens_by_id.insert(&token_id, &token).is_none(),
                "Token already exists"
            );
            self.internal_add_token_to_owner(&token.owner_id, &token_id);
        }

        // update tokens per package
        for i in 0..packages.len() {
            self.tokens_per_package.insert(&series.params.packages[i], &packages[i]);
        }

        // refund unused deposit amount
        let new_token_size_in_bytes = env::storage_usage() - initial_storage_usage;
        let required_storage_in_bytes =
            self.extra_storage_in_bytes_per_token + new_token_size_in_bytes;
        refund_deposit(required_storage_in_bytes);
    }

    #[payable]
    pub fn nft_mint(
        &mut self,
        series_args: SeriesArgs,
        perpetual_royalties: Option<HashMap<AccountId, u32>>,
        receiver_id: Option<ValidAccountId>,
    ) {
        let initial_storage_usage = env::storage_usage();
        let mut owner_id = env::predecessor_account_id();
        if let Some(receiver_id) = receiver_id {
            owner_id = receiver_id.into();
        }

        // CUSTOM - enforce series supply limit and store tokens per series / per package
        let series = self.series_by_name.get(&series_args.name).unwrap_or_else(|| panic!("No series {}", series_args.name));
        let mut tokens_per_series = self.tokens_per_series
            .get(&series_args.name)
            .unwrap_or_else(|| {
                UnorderedSet::new(
                    StorageKey::TokenPerSeriesInner {
                        series_name_hash: hash_account_id(&series_args.name),
                    }
                    .try_to_vec()
                    .unwrap(),
                )
            });
        let num_tokens = tokens_per_series.len();
        assert!(num_tokens < series.params.max_supply.0, "Cannot mint anymore of series: {}", series_args.name);

        let token_id = get_token_id(&series_args.name, num_tokens);

        if series.params.enforce_unique_args {
            let series_arg_hash = hash_account_id(&format!("{}{}", series_args.name, series_args.mint.join("")));
            assert!(self.series_arg_hashes.insert(&series_arg_hash), "Token in series has identical args");
        }
        
        // insert everything
        tokens_per_series.insert(&token_id);
        self.tokens_per_series.insert(&series_args.name, &tokens_per_series);
        for package in series.params.packages {
            let mut tokens_per_package = self.tokens_per_package
                .get(&package)
                .unwrap_or_else(|| {
                    UnorderedSet::new(
                        StorageKey::TokenPerPackageInner {
                            package_name_version_hash: hash_account_id(&package),
                        }
                        .try_to_vec()
                        .unwrap(),
                    )
                });
            tokens_per_package.insert(&token_id);
            self.tokens_per_package.insert(&package, &tokens_per_package);
        }

        // create royalty map
        let mut royalty = HashMap::new();
        let mut total_perpetual = 0;
        // user added perpetual_royalties (percentage paid with every transfer)
        if let Some(perpetual_royalties) = perpetual_royalties {
            assert!(perpetual_royalties.len() < 7, "Cannot add more than 6 perpetual royalty amounts");
            for (account, amount) in perpetual_royalties {
                royalty.insert(account, amount);
                total_perpetual += amount;
            }
        }
        // royalty limit for minter capped at 20%
        assert!(total_perpetual <= MINTER_ROYALTY_CAP, "Perpetual royalties cannot be more than 20%");
        // END CUSTOM

        // insert token like normal
        let token = Token {
            owner_id,
            approved_account_ids: Default::default(),
            next_approval_id: 0,
            royalty,
            series_args,
            issued_at: env::block_timestamp().into()
        };
        assert!(
            self.tokens_by_id.insert(&token_id, &token).is_none(),
            "Token already exists"
        );
        self.internal_add_token_to_owner(&token.owner_id, &token_id);

        // refund unused deposit amount
        let new_token_size_in_bytes = env::storage_usage() - initial_storage_usage;
        let required_storage_in_bytes =
            self.extra_storage_in_bytes_per_token + new_token_size_in_bytes;

        refund_deposit(required_storage_in_bytes);
    }
}

fn get_token_id(series_name: &str, which: u64) -> String {
    format!("{}{}{}", series_name, SERIES_VARIANT_DELIMETER, which)
}