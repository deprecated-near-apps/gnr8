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
    pub media: Option<String>, // URL to associated media, preferably to decentralized, content-addressed storage
    pub media_hash: Option<Base64VecU8>, // Base64-encoded sha256 hash of content referenced by the `media` field. Required if `media` is included.
    pub issued_at: Option<String>, // ISO 8601 datetime when token was issued or minted
}
