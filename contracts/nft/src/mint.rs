use crate::*;

#[near_bindgen]
impl Contract {

    #[payable]
    pub fn lazy_mint(
        &mut self,
        series_mint_args: SeriesMintArgs,
    ) -> (TokenId, AccountId) {
        let series_name = series_mint_args.series_name.clone();
        let series = self
            .series_by_name
            .get(&series_name)
            .unwrap_or_else(|| panic!("No series {}", series_name));

        assert!(
            series.approved_account_ids.contains(&env::predecessor_account_id()),
            "predecessor_account_id (market?) not approved to lazy mint series"
        );

        self.internal_mint(series, series_mint_args)
    }

    fn internal_mint(
        &mut self,
        series: Series,
        series_mint_args: SeriesMintArgs,
    ) -> (TokenId, AccountId) {
        let initial_storage_usage = env::storage_usage();
        let mut owner_id = env::predecessor_account_id();

        let SeriesMintArgs {
            series_name,
            mint,
            owner,
            perpetual_royalties,
            receiver_id,
            media,
        } = series_mint_args;

        let mut tokens_per_series = self.tokens_per_series.get(&series_name).unwrap_or_else(|| {
            UnorderedSet::new(StorageKey::TokenPerSeriesInner {
                series_name_hash: hash_account_id(&series_name),
            })
        });
        let num_tokens = tokens_per_series.len();
        assert!(
            num_tokens < series.params.max_supply.0,
            "Cannot mint anymore of series: {}",
            series_name
        );

        if let Some(receiver_id) = receiver_id {
            owner_id = receiver_id.into();
        }
        let token_id = format!("{}{}{}", series_name, SERIES_VARIANT_DELIMETER, num_tokens);

        if series.params.enforce_unique_mint_args {
            let series_mint_arg_hash = hash_account_id(&format!("{}{}", series_name, mint.join(ARGS_DELIMETER)));
            assert!(
                self.series_mint_arg_hashes.insert(&series_mint_arg_hash),
                "Token in series has identical args"
            );
        }

        // insert everything
        tokens_per_series.insert(&token_id);
        self.tokens_per_series
            .insert(&series_name, &tokens_per_series);
        for package in series.params.packages {
            let mut tokens_per_package =
                self.tokens_per_package.get(&package).unwrap_or_else(|| {
                    UnorderedSet::new(StorageKey::TokenPerPackageInner {
                        package_name_version_hash: hash_account_id(&package),
                    })
                });
            tokens_per_package.insert(&token_id);
            self.tokens_per_package
                .insert(&package, &tokens_per_package);
        }

        // create royalty map
        let mut royalty = series.royalty;
        // user added perpetual_royalties (percentage paid with every transfer)
        if let Some(perpetual_royalties) = perpetual_royalties {
            let mut total_perpetual = 0;
            for (account, amount) in perpetual_royalties {
                royalty.insert(account, amount);
                total_perpetual += amount;
            }
            assert!(
                royalty.len() < 8,
                "Cannot have more than 8 royalty receivers"
            );
            assert!(
                total_perpetual <= MINTER_ROYALTY_CAP,
                "Perpetual royalties cannot be more than 20%"
            );
        }

        let token = Token {
            owner_id: owner_id.clone(),
            approved_account_ids: Default::default(),
            next_approval_id: 0,
        };
        assert!(
            self.tokens_by_id.insert(&token_id, &token).is_none(),
            "Token already exists"
        );

        // handle media
        let media = media.map(|s| format!("{}{}.png", s, token_id));

        self.token_data_by_id.insert(
            &token_id,
            &TokenData {
                series_args: SeriesArgs {
                    series_name,
                    mint,
                    owner,
                },
                royalty,
                num_transfers: U64(0),
                metadata: TokenMetadata{
                    media,
                    issued_at: Some(env::block_timestamp().to_string())
                },
            },
        );
        self.internal_add_token_to_owner(&token.owner_id, &token_id);

        // refund unused deposit amount
        refund_deposit(initial_storage_usage, env::storage_usage() + self.extra_storage_in_bytes_per_token, None);

        (token_id, series.owner_id)
    }

    pub fn estimate_mint_cost(&mut self, series_mint_args: SeriesMintArgs) -> Balance {
        let initial_storage_usage = env::storage_usage();
        let mut owner_id = env::predecessor_account_id();

        let SeriesMintArgs {
            series_name,
            mint,
            owner,
            perpetual_royalties,
            receiver_id,
            media,
        } = series_mint_args;

        // CUSTOM - enforce series supply limit and store tokens per series / per package
        let series = self
            .series_by_name
            .get(&series_name)
            .unwrap_or_else(|| panic!("No series {}", series_name));

        let mut tokens_per_series = self.tokens_per_series.get(&series_name).unwrap_or_else(|| {
            UnorderedSet::new(StorageKey::TokenPerSeriesInner {
                series_name_hash: hash_account_id(&series_name),
            })
        });
        let num_tokens = tokens_per_series.len();
        if let Some(receiver_id) = receiver_id {
            owner_id = receiver_id.into();
        }
        let token_id = format!("{}{}{}", series_name, SERIES_VARIANT_DELIMETER, num_tokens);

        // insert everything
        tokens_per_series.insert(&token_id);
        self.tokens_per_series
            .insert(&series_name, &tokens_per_series);
        for package in series.params.packages.clone() {
            let mut tokens_per_package =
                self.tokens_per_package.get(&package).unwrap_or_else(|| {
                    UnorderedSet::new(StorageKey::TokenPerPackageInner {
                        package_name_version_hash: hash_account_id(&package),
                    })
                });
            tokens_per_package.insert(&token_id);
            self.tokens_per_package
                .insert(&package, &tokens_per_package);
        }

        // create royalty map
        let mut royalty = series.royalty;
        // user added perpetual_royalties (percentage paid with every transfer)
        if let Some(perpetual_royalties) = perpetual_royalties {
            for (account, amount) in perpetual_royalties {
                royalty.insert(account, amount);
            }
        }

        // insert token like normal
        let token = Token {
            owner_id,
            approved_account_ids: Default::default(),
            next_approval_id: 0,
        };
        assert!(
            self.tokens_by_id.insert(&token_id, &token).is_none(),
            "Token already exists"
        );

        // handle media
        let media = media.map(|s| format!("{}{}.png", s, token_id));

        self.token_data_by_id.insert(
            &token_id,
            &TokenData {
                series_args: SeriesArgs {
                    series_name: series_name.clone(),
                    mint,
                    owner,
                },
                royalty,
                num_transfers: U64(0),
                metadata: TokenMetadata{
                    media,
                    issued_at: Some(env::block_timestamp().to_string())
                },
            },
        );
        self.internal_add_token_to_owner(&token.owner_id, &token_id);

        // calculate storage required
        let new_token_size_in_bytes = env::storage_usage() - initial_storage_usage;
        let required_storage_in_bytes =
            self.extra_storage_in_bytes_per_token + new_token_size_in_bytes;

        // remove everything
        tokens_per_series.remove(&token_id);
        self.tokens_per_series
            .insert(&series_name, &tokens_per_series);
        for package in series.params.packages {
            let mut tokens_per_package =
                self.tokens_per_package.get(&package).unwrap_or_else(|| {
                    UnorderedSet::new(StorageKey::TokenPerPackageInner {
                        package_name_version_hash: hash_account_id(&package),
                    })
                });
            tokens_per_package.remove(&token_id);
            self.tokens_per_package
                .insert(&package, &tokens_per_package);
        }
        self.tokens_by_id.remove(&token_id);
        self.internal_remove_token_from_owner(&token.owner_id, &token_id);

        env::storage_byte_cost() * Balance::from(required_storage_in_bytes)
    }
}
