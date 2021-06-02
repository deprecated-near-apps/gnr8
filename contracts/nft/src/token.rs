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

impl Contract {
    pub fn update_metadata_media(&mut self, token_id: TokenId, media: String) {
        let token = self.tokens_by_id.get(&token_id).expect("No token");
        assert_eq!(token.owner_id, env::predecessor_account_id(), "Must be token owner");
        let mut token_data = self.token_data_by_id.get(&token_id).expect("No token");
        token_data.metadata.media = Some(media);
        self.token_data_by_id.insert(&token_id, &token_data);
    }
}
