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
    // CUSTOM - fields
    pub royalty: HashMap<AccountId, u32>,
    pub issued_at: U64,
    pub num_transfers: U64,
    pub series_args: SeriesArgs,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct JsonToken {
    pub token_id: TokenId,
    pub owner_id: AccountId,
    pub approved_account_ids: HashMap<AccountId, U64>,

    // CUSTOM - fields
    pub series_args: SeriesArgs,
    pub royalty: HashMap<AccountId, u32>,
    pub issued_at: U64,
    pub num_transfers: U64,
}
