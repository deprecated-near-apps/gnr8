use std::cmp::min;
use std::collections::HashMap;
use std::mem::size_of;

use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LazyOption, LookupMap, LookupSet, UnorderedMap, UnorderedSet};
use near_sdk::json_types::{Base64VecU8, ValidAccountId, U128, U64};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::BorshStorageKey;
use near_sdk::{
    assert_one_yocto,
    env, ext_contract, log, near_bindgen, AccountId, Balance, CryptoHash, Gas, PanicOnDefault,
    Promise, PromiseResult, StorageUsage,
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

pub type TypeSupplyCaps = HashMap<String, U64>;
pub const CONTRACT_ROYALTY_CAP: u32 = 1000;
pub const MINTER_ROYALTY_CAP: u32 = 2000;
static SERIES_VARIANT_DELIMETER: &str = ":";
static ARGS_DELIMETER: &str = ",";
const GAS_FOR_SERIES_APPROVE: Gas = 20_000_000_000_000;
const GAS_FOR_NFT_APPROVE: Gas = 10_000_000_000_000;
const GAS_FOR_RESOLVE_TRANSFER: Gas = 10_000_000_000_000;
const GAS_FOR_NFT_TRANSFER_CALL: Gas = 25_000_000_000_000 + GAS_FOR_RESOLVE_TRANSFER;
const NO_DEPOSIT: Balance = 0;

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Price {
    pub ft_token_id: ValidAccountId,
    pub price: Option<U128>,
}
#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SaleArgs {
    pub sale_conditions: Vec<Price>,
    pub token_type: Option<String>,
}

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
    pub series_mint_arg_hashes: LookupSet<CryptoHash>,
    pub series_owner_arg_hashes: LookupSet<CryptoHash>,
    pub series_by_name: UnorderedMap<SeriesName, Series>,
    pub series_per_owner: LookupMap<AccountId, UnorderedSet<SeriesName>>,
    pub tokens_per_series: LookupMap<SeriesName, UnorderedSet<TokenId>>,
    pub packages_by_name_version: UnorderedMap<PackageNameVersion, Package>,
    pub tokens_per_package: LookupMap<PackageNameVersion, UnorderedSet<TokenId>>,
    pub contract_royalty: u32,
}

/// Helper structure to for keys of the persistent collections.
#[derive(BorshStorageKey, BorshSerialize)]
pub enum StorageKey {
    TokensPerOwner,
    TokenPerOwnerInner {
        account_id_hash: CryptoHash,
    },
    TokensById,
    NftMetadata,
    // CUSTOM
    TokenDataById,
    SeriesMintArgHashes,
    SeriesOwnerArgHashes,
    SeriesByName,
    SeriesApprovedIds {
        series_name_hash: CryptoHash,
    },
    SeriesPerOwner,
    SeriesPerOwnerInner {
        account_id_hash: CryptoHash,
    },
    TokensPerSeries,
    TokenPerSeriesInner {
        series_name_hash: CryptoHash,
    },
    PackagesByNameVersion,
    TokensPerPackage,
    TokenPerPackageInner {
        package_name_version_hash: CryptoHash,
    },
}

#[near_bindgen]
impl Contract {
    #[init]
    pub fn new(owner_id: ValidAccountId, metadata: NFTMetadata) -> Self {
        let mut this = Self {
            tokens_per_owner: LookupMap::new(StorageKey::TokensPerOwner),
            tokens_by_id: UnorderedMap::new(StorageKey::TokensById),

            owner_id: owner_id.into(),
            extra_storage_in_bytes_per_token: 0,
            metadata: LazyOption::new(StorageKey::NftMetadata, Some(&metadata)),

            // CUSTOM
            token_data_by_id: LookupMap::new(StorageKey::TokenDataById),
            series_mint_arg_hashes: LookupSet::new(StorageKey::SeriesMintArgHashes),
            series_owner_arg_hashes: LookupSet::new(StorageKey::SeriesOwnerArgHashes),
            series_by_name: UnorderedMap::new(StorageKey::SeriesByName),
            series_per_owner: LookupMap::new(StorageKey::SeriesPerOwner),
            tokens_per_series: LookupMap::new(StorageKey::TokensPerSeries),

            packages_by_name_version: UnorderedMap::new(StorageKey::PackagesByNameVersion),
            tokens_per_package: LookupMap::new(StorageKey::TokensPerPackage),

            contract_royalty: 0,
        };

        this.measure_min_token_storage_cost();

        this
    }

    fn measure_min_token_storage_cost(&mut self) {
        let initial_storage_usage = env::storage_usage();
        let tmp_account_id = "a".repeat(64);
        let u = UnorderedSet::new(StorageKey::TokenPerOwnerInner {
            account_id_hash: hash_account_id(&tmp_account_id),
        });
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
        assert!(
            contract_royalty <= CONTRACT_ROYALTY_CAP,
            "Contract royalties limited to 10% for owner"
        );
        self.contract_royalty = contract_royalty;
    }

    /// CUSTOM - views

    pub fn get_contract_royalty(&self) -> u32 {
        self.contract_royalty
    }
}
