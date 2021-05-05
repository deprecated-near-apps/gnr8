use crate::*;
use near_sdk::{log};

#[near_bindgen]
impl Contract {
    #[payable]
    pub fn nft_mint(
        &mut self,
        series_args: SeriesArgs,
        perpetual_royalties: Option<HashMap<AccountId, u32>>,
        receiver_id: Option<ValidAccountId>,
    ) {
        // CUSTOM - token_id is hash of all series args, enforcing uniqueness of minted works
        let token_id = format!("{:02x?}", env::sha256(
            format!("{}{}{}", series_args.name, series_args.mint.join(""), series_args.owner.join("")).as_bytes()
        )).replace(", ", "").replace("0x", "").replace("[", "").replace("]", "");

        log!("Minting: {}", token_id);

        let initial_storage_usage = env::storage_usage();
        let mut owner_id = env::predecessor_account_id();
        if let Some(receiver_id) = receiver_id {
            owner_id = receiver_id.into();
        }

        // CUSTOM - create royalty map
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

        // CUSTOM - enforce series supply limit and store tokens per series
        let series_name = series_args.name.clone();
        let series = self.series_by_name.get(&series_name).unwrap_or_else(|| panic!("No series {}", series_name));
        let supply_limit = series.params.supply_limit;
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
        assert!(tokens_per_series.len() < u64::from(supply_limit), "Cannot mint anymore of {}", series_name);
        tokens_per_series.insert(&token_id);
        self.tokens_per_series.insert(&series_name, &tokens_per_series);

        // CUSTOM - store tokens per packages used by series
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
        // END CUSTOM

        // insert token like normal
        let token = Token {
            owner_id,
            approved_account_ids: Default::default(),
            next_approval_id: 0,
            royalty,
            series_args,
        };
        assert!(
            self.tokens_by_id.insert(&token_id, &token).is_none(),
            "Token for this series using those args already exists"
        );
        self.internal_add_token_to_owner(&token.owner_id, &token_id);

        // refund unused deposit amount
        let new_token_size_in_bytes = env::storage_usage() - initial_storage_usage;
        let required_storage_in_bytes =
            self.extra_storage_in_bytes_per_token + new_token_size_in_bytes;

        refund_deposit(required_storage_in_bytes);
    }
}