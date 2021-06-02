use crate::*;

pub type TokenId = String;
pub type Payout = HashMap<AccountId, U128>;

#[derive(BorshDeserialize, BorshSerialize)]
pub struct Token {
    pub owner_id: AccountId,
    pub approved_account_ids: HashMap<AccountId, U64>,
    pub next_approval_id: u64,
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct TokenData {
    pub metadata: TokenMetadata,
    // STANDARDS TBD
    pub royalty: HashMap<AccountId, u32>,
    // CUSTOM
    pub series_args: SeriesArgs,
    pub num_transfers: U64,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct JsonToken {
    pub token_id: TokenId,
    pub owner_id: AccountId,
    pub approved_account_ids: HashMap<AccountId, U64>,
    pub metadata: TokenMetadata,
    // STANDARDS TBD
    pub royalty: HashMap<AccountId, u32>,

    // CUSTOM
    pub series_args: SeriesArgs,
    pub num_transfers: U64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, BorshDeserialize, BorshSerialize)]
#[serde(crate = "near_sdk::serde")]
pub struct TokenMetadata {
    pub media: Option<String>,
    pub issued_at: Option<String>,
}


#[near_bindgen]
impl Contract {

    /// custom token methods

    #[payable]
    pub fn update_token_owner_args(&mut self, token_id: TokenId, owner_args: Vec<String>) {
        assert_at_least_one_yocto();
        let predecessor_account_id = env::predecessor_account_id();
        let initial_storage_usage = env::storage_usage();

        let token = self
            .tokens_by_id
            .get(&token_id)
            .unwrap_or_else(|| panic!("No token {}", token_id));

        assert_eq!(token.owner_id, predecessor_account_id, "Must be token owner");

        let mut token_data = self
            .token_data_by_id
            .get(&token_id)
            .unwrap_or_else(|| panic!("No token_data {}", token_id));

        let series = self
            .series_by_name
            .get(&token_data.series_args.series_name)
            .unwrap_or_else(|| panic!("No series {}", token_data.series_args.series_name));

        assert_eq!(series.params.owner.len(), owner_args.len(), "Incorrect length of owner_args for series");
        
        if series.params.enforce_unique_owner_args {
            let previous_owner_arg_hash = hash_account_id(&format!("{}{}", series.series_name, token_data.series_args.owner.join(ARGS_DELIMETER)));
            self.series_owner_arg_hashes.remove(&previous_owner_arg_hash);
            let owner_arg_hash = hash_account_id(&format!("{}{}", series.series_name, owner_args.join(ARGS_DELIMETER)));
            assert!(
                self.series_owner_arg_hashes.insert(&owner_arg_hash),
                "Token in series has identical owner args"
            );
        }

        token_data.series_args.owner = owner_args;
        self.token_data_by_id.insert(&token_id, &token_data);

        // TODO clean up

        refund_deposit(initial_storage_usage, env::storage_usage(), None);
    }

}

