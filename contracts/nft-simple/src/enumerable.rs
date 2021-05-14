use crate::*;

#[near_bindgen]
impl Contract {

    pub fn nft_tokens(
        &self,
        from_index: U64,
        limit: U64,
    ) -> Vec<JsonToken> {
        let mut tmp = vec![];
        let keys = self.tokens_by_id.keys_as_vector();
        let start = u64::from(from_index);
        let end = min(start + u64::from(limit), keys.len());
        for i in start..end {
            tmp.push(self.nft_token(keys.get(i).unwrap()).unwrap());
        }
        tmp
    }

    pub fn nft_tokens_batch(
        &self,
        token_ids: Vec<String>,
    ) -> Vec<JsonToken> {
        let mut tmp = vec![];
        for token_id in token_ids {
            tmp.push(self.nft_token(token_id).unwrap());
        }
        tmp
    }
    
    pub fn nft_supply_for_owner(
        &self,
        account_id: AccountId,
    ) -> U64 {
        let tokens_owner = self.tokens_per_owner.get(&account_id);
        if let Some(tokens_owner) = tokens_owner {
            U64(tokens_owner.len())
        } else {
            U64(0)
        }
    }

    pub fn nft_tokens_for_owner(
        &self,
        account_id: AccountId,
        from_index: U64,
        limit: U64,
    ) -> Vec<JsonToken> {
        let mut tmp = vec![];
        let tokens_owner = self.tokens_per_owner.get(&account_id);
        let tokens = if let Some(tokens_owner) = tokens_owner {
            tokens_owner
        } else {
            return vec![];
        };
        let keys = tokens.as_vector();
        let start = u64::from(from_index);
        let end = min(start + u64::from(limit), keys.len());
        for i in start..end {
            tmp.push(self.nft_token(keys.get(i).unwrap()).unwrap());
        }
        tmp
    }

    /// CUSTOM views for series and packages
    
    pub fn nft_supply_for_series(
        &self,
        series_name: String,
    ) -> U64 {
        let tokens_per_series = self.tokens_per_series.get(&series_name);
        if let Some(tokens_per_series) = tokens_per_series {
            U64(tokens_per_series.len())
        } else {
            U64(0)
        }
    }

    pub fn nft_tokens_for_series(
        &self,
        series_name: String,
        from_index: U64,
        limit: U64,
    ) -> Vec<JsonToken> {
        let mut tmp = vec![];
        let tokens_per_series = self.tokens_per_series.get(&series_name);
        let tokens_per_series = if let Some(tokens_per_series) = tokens_per_series {
            tokens_per_series
        } else {
            return vec![];
        };
        let keys = tokens_per_series.as_vector();
        let start = u64::from(from_index);
        let end = min(start + u64::from(limit), keys.len());
        for i in start..end {
            tmp.push(self.nft_token(keys.get(i).unwrap()).unwrap());
        }
        tmp
    }

    pub fn nft_supply_for_package(
        &self,
        series_name: String,
    ) -> U64 {
        let tokens_per_package = self.tokens_per_package.get(&series_name);
        if let Some(tokens_per_package) = tokens_per_package {
            U64(tokens_per_package.len())
        } else {
            U64(0)
        }
    }

    pub fn nft_tokens_for_package(
        &self,
        series_name: String,
        from_index: U64,
        limit: U64,
    ) -> Vec<JsonToken> {
        let mut tmp = vec![];
        let tokens_per_package = self.tokens_per_package.get(&series_name);
        let tokens_per_package = if let Some(tokens_per_package) = tokens_per_package {
            tokens_per_package
        } else {
            return vec![];
        };
        let keys = tokens_per_package.as_vector();
        let start = u64::from(from_index);
        let end = min(start + u64::from(limit), keys.len());
        for i in start..end {
            tmp.push(self.nft_token(keys.get(i).unwrap()).unwrap());
        }
        tmp
    }
}
