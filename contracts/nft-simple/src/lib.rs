use std::collections::HashMap;
use std::cmp::min;
use std::mem::size_of;

use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LazyOption, LookupMap, LookupSet, UnorderedMap, UnorderedSet};
use near_sdk::json_types::{Base64VecU8, ValidAccountId, U64, U128};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{
    log, env, near_bindgen, AccountId, Balance, CryptoHash, PanicOnDefault, Promise, StorageUsage,
};

use crate::internal::*;
pub use crate::metadata::*;
pub use crate::mint::*;
pub use crate::nft_core::*;
pub use crate::token::*;

// CUSTOM
pub use crate::enumerable::*;
pub use crate::package::*;
pub use crate::series::*;

mod internal;
mod metadata;
mod mint;
mod nft_core;
mod token;
// CUSTOM
mod enumerable;
mod package;
mod series;

// deprecated???
pub type TokenType = String;
pub type TypeSupplyCaps = HashMap<TokenType, U64>;
pub const CONTRACT_ROYALTY_CAP: u32 = 1000;
pub const MINTER_ROYALTY_CAP: u32 = 2000;
static SERIES_VARIANT_DELIMETER: &str = ":";

near_sdk::setup_alloc!();

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    pub tokens_per_owner: LookupMap<AccountId, UnorderedSet<TokenId>>,
    pub tokens_by_id: UnorderedMap<TokenId, Token>,
    pub owner_id: AccountId,
    pub extra_storage_in_bytes_per_token: StorageUsage,
    pub metadata: LazyOption<NFTMetadata>,

    /// CUSTOM
    pub token_data_by_id: LookupMap<TokenId, TokenData>,
    pub series_arg_hashes: LookupSet<CryptoHash>,
    pub series_by_name: UnorderedMap<SeriesName, Series>,
    pub series_per_owner: LookupMap<AccountId, UnorderedSet<SeriesName>>,
    pub tokens_per_series: LookupMap<SeriesName, UnorderedSet<TokenId>>,
    pub packages_by_name_version: UnorderedMap<PackageNameVersion, Package>,
    pub tokens_per_package: LookupMap<PackageNameVersion, UnorderedSet<TokenId>>,
    pub contract_royalty: u32,
}

/// Helper structure to for keys of the persistent collections.
#[derive(BorshSerialize)]
pub enum StorageKey {
    TokensPerOwner,
    TokenPerOwnerInner { account_id_hash: CryptoHash },
    TokensById,
    NftMetadata,
    // CUSTOM
    TokenDataById,
    SeriesArgHashes,
    SeriesByName,
    SeriesPerOwner,
    SeriesPerOwnerInner { account_id_hash: CryptoHash },
    TokensPerSeries,
    TokenPerSeriesInner { series_name_hash: CryptoHash },
    PackagesByNameVersion,
    TokensPerPackage,
    TokenPerPackageInner { package_name_version_hash: CryptoHash },
}

#[near_bindgen]
impl Contract {
    #[init]
    pub fn new(owner_id: ValidAccountId, metadata: NFTMetadata) -> Self {
        let mut this = Self {
            tokens_per_owner: LookupMap::new(StorageKey::TokensPerOwner.try_to_vec().unwrap()),
            tokens_by_id: UnorderedMap::new(StorageKey::TokensById.try_to_vec().unwrap()),
           
            owner_id: owner_id.into(),
            extra_storage_in_bytes_per_token: 0,
            metadata: LazyOption::new(
                StorageKey::NftMetadata.try_to_vec().unwrap(),
                Some(&metadata),
            ),

            // CUSTOM
            token_data_by_id: LookupMap::new(StorageKey::TokenDataById.try_to_vec().unwrap()),
            series_arg_hashes: LookupSet::new(StorageKey::SeriesArgHashes.try_to_vec().unwrap()),
            series_by_name: UnorderedMap::new(StorageKey::SeriesByName.try_to_vec().unwrap()),
            series_per_owner: LookupMap::new(StorageKey::SeriesPerOwner.try_to_vec().unwrap()),
            tokens_per_series: LookupMap::new(StorageKey::TokensPerSeries.try_to_vec().unwrap()),

            packages_by_name_version: UnorderedMap::new(StorageKey::PackagesByNameVersion.try_to_vec().unwrap()),
            tokens_per_package: LookupMap::new(StorageKey::TokensPerPackage.try_to_vec().unwrap()),

            contract_royalty: 0,
        };

        this.measure_min_token_storage_cost();

        this
    }

    fn measure_min_token_storage_cost(&mut self) {
        let initial_storage_usage = env::storage_usage();
        let tmp_account_id = "a".repeat(64);
        let u = UnorderedSet::new(
            StorageKey::TokenPerOwnerInner {
                account_id_hash: hash_account_id(&tmp_account_id),
            }
            .try_to_vec()
            .unwrap(),
        );
        self.tokens_per_owner.insert(&tmp_account_id, &u);

        let tokens_per_owner_entry_in_bytes = env::storage_usage() - initial_storage_usage;
        let owner_id_extra_cost_in_bytes = (tmp_account_id.len() - self.owner_id.len()) as u64;

        self.extra_storage_in_bytes_per_token =
            tokens_per_owner_entry_in_bytes + owner_id_extra_cost_in_bytes;

        self.tokens_per_owner.remove(&tmp_account_id);
    }

    /// CUSTOM - setters for owner

    pub fn set_contract_royalty(&mut self, contract_royalty: u32) {
        self.assert_owner();
        assert!(contract_royalty <= CONTRACT_ROYALTY_CAP, "Contract royalties limited to 10% for owner");
        self.contract_royalty = contract_royalty;
    }

    /// CUSTOM - views

    pub fn get_contract_royalty(&self) -> u32 {
        self.contract_royalty
    }
}
