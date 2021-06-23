use crate::*;

pub type SeriesName = String;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SeriesMintArgs {
    pub series_name: String,
    pub mint: Vec<String>,
    pub owner: Vec<String>,
    pub perpetual_royalties: Option<HashMap<AccountId, u32>>,
    pub receiver_id: Option<ValidAccountId>,
    pub media: Option<String>,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SeriesArgs {
    pub series_name: String,
    pub mint: Vec<String>,
    pub owner: Vec<String>,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SeriesParams {
    pub max_supply: U64,
    pub enforce_unique_mint_args: bool,
    pub enforce_unique_owner_args: bool,
    pub mint: Vec<String>,
    pub owner: Vec<String>,
    pub packages: Vec<String>,
}

#[derive(BorshDeserialize, BorshSerialize)]
pub enum Src {
    Code(String),
    Bytes(U64),
}

impl Serialize for Src {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: near_sdk::serde::Serializer,
    {
        if let Src::Code(s) = self {
            serializer.serialize_str(s)
        } else {
            serializer.serialize_str("")
        }
    }
}

#[derive(BorshDeserialize, BorshSerialize, Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Series {
    pub series_name: String,
    pub src: Src,
    pub royalty: HashMap<AccountId, u32>,
    pub owner_id: AccountId,
    #[serde(with = "unordered_set_json")]
    pub approved_account_ids: UnorderedSet<AccountId>,
    pub created_at: U64,
    pub params: SeriesParams,
}

mod unordered_set_json {
    use super::*;
    use near_sdk::serde::{self, Serializer};

    pub fn serialize<S, T>(set: &UnorderedSet<T>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
        T: Serialize + BorshSerialize + BorshDeserialize,
    {
        serde::Serialize::serialize(&set.to_vec(), serializer)
    }
}

#[near_bindgen]
impl Contract {
    #[payable]
    pub fn series_create_and_approve(
        &mut self,
        series_name: String,
        bytes: U64,
        params: SeriesParams,
        account_id: ValidAccountId,
        royalty: Option<HashMap<AccountId, u32>>,
        msg: Option<String>,
    ) {
        assert_at_least_one_yocto();
        let initial_storage_usage = env::storage_usage();

        self.series_create_internal(series_name.clone(), bytes, params, royalty);

        let mut series = self
            .series_by_name
            .get(&series_name)
            .expect("Not valid series");

        assert_eq!(
            series.owner_id,
            env::predecessor_account_id(),
            "Must be series owner"
        );

        series.approved_account_ids.insert(account_id.as_ref());

        let storage_cost = env::storage_byte_cost() * Balance::from(bytes.0 + env::storage_usage() - initial_storage_usage);

        if let Some(msg) = msg {
            ext_non_fungible_series_approval_receiver::series_on_approve(
                series_name,
                series.owner_id,
                msg,
                account_id.as_ref(),
                env::attached_deposit()
                    .checked_sub(storage_cost)
                    .expect("Deposit not enough for series"),
                env::prepaid_gas() - GAS_FOR_SERIES_APPROVE,
            );
        }
    }

    #[payable]
    pub fn series_create(
        &mut self,
        series_name: String,
        bytes: U64,
        params: SeriesParams,
        royalty: Option<HashMap<AccountId, u32>>,
    ) {
        assert_at_least_one_yocto();
        let initial_storage_usage = env::storage_usage();

        self.series_create_internal(series_name, bytes, params, royalty);

        refund_deposit(initial_storage_usage, bytes.0 + env::storage_usage(), None);
    }

    fn series_create_internal(
        &mut self,
        series_name: String,
        bytes: U64,
        params: SeriesParams,
        royalty: Option<HashMap<AccountId, u32>>,
    ) {
        let owner_id = env::predecessor_account_id();
        let name = series_name.to_lowercase();

        assert!(
            self.series_by_name
                .insert(
                    &name,
                    &Series {
                        series_name: name.clone(),
                        src: Src::Bytes(bytes),
                        royalty: royalty.unwrap_or_default(),
                        owner_id: owner_id.clone(),
                        created_at: env::block_timestamp().into(),
                        params,
                        approved_account_ids: UnorderedSet::new(StorageKey::SeriesApprovedIds {
                            series_name_hash: hash_account_id(&series_name),
                        })
                    }
                )
                .is_none(),
            "Series with this name already exists"
        );

        let mut series_per_owner = self.series_per_owner.get(&owner_id).unwrap_or_else(|| {
            UnorderedSet::new(StorageKey::SeriesPerOwnerInner {
                account_id_hash: hash_account_id(&owner_id),
            })
        });
        series_per_owner.insert(&series_name);
        self.series_per_owner.insert(&owner_id, &series_per_owner);
    }

    #[payable]
    pub fn series_approve(
        &mut self,
        series_name: String,
        account_id: ValidAccountId,
        msg: Option<String>,
    ) {
        assert_at_least_one_yocto();
        let initial_storage_usage = env::storage_usage();

        let mut series = self
            .series_by_name
            .get(&series_name)
            .expect("Not valid series");
        assert_eq!(
            series.owner_id,
            env::predecessor_account_id(),
            "Must be series owner"
        );

        series.approved_account_ids.insert(account_id.as_ref());

        let storage_used = env::storage_usage() - initial_storage_usage;

        if let Some(msg) = msg {
            ext_non_fungible_series_approval_receiver::series_on_approve(
                series_name,
                series.owner_id,
                msg,
                account_id.as_ref(),
                env::attached_deposit()
                    .checked_sub(env::storage_byte_cost() * Balance::from(storage_used))
                    .expect("Must pay enough to cover storage"),
                env::prepaid_gas() - GAS_FOR_SERIES_APPROVE,
            )
            .as_return(); // Returning this promise
        }
    }

    pub fn series_remove_approval(&mut self, series_name: String, account_id: ValidAccountId) {
        let predecessor_account_id = env::predecessor_account_id();
        let initial_storage_usage = env::storage_usage();

        let mut series = self
            .series_by_name
            .get(&series_name)
            .expect("Not valid series");

        assert_eq!(
            series.owner_id, predecessor_account_id,
            "Must be series owner"
        );

        series.approved_account_ids.remove(account_id.as_ref());

        let refund =
            env::storage_byte_cost() * (initial_storage_usage - env::storage_usage()) as u128;
        if refund > 1 {
            Promise::new(predecessor_account_id).transfer(refund);
        }
    }

    pub fn series_update(&mut self, series_name: String, src: String) {
        let mut series = self
            .series_by_name
            .get(&series_name)
            .unwrap_or_else(|| panic!("No series {}", series_name));
        assert_eq!(
            series.owner_id,
            env::predecessor_account_id(),
            "Must be series owner"
        );
        if let Src::Bytes(l) = series.src {
            assert_eq!(l.0, src.len() as u64, "Must be exactly the same bytes");
        } else {
            env::panic(b"Cannot set src twice")
        }

        series.src = Src::Code(src);
        self.series_by_name.insert(&series_name, &series);
    }

    /// views

    pub fn series_supply(&self) -> U64 {
        U64(self.series_by_name.keys_as_vector().len())
    }

    pub fn series_data(&self, series_name: SeriesName) -> Series {
        self.series_by_name
            .get(&series_name)
            .unwrap_or_else(|| panic!("No series {}", series_name))
    }

    pub fn series_range(&self, from_index: U64, limit: u64) -> Vec<Series> {
        let keys = self.series_by_name.keys_as_vector();
        let start = u64::from(from_index);
        let end = min(start + limit, keys.len());
        (start..end)
            .map(|i| self.series_by_name.get(&keys.get(i).unwrap()).unwrap())
            .collect()
    }

    pub fn series_batch(&self, series_names: Vec<String>) -> Vec<Series> {
        series_names
            .into_iter()
            .map(|series_name| self.series_by_name.get(&series_name).unwrap())
            .collect()
    }
    
    pub fn series_supply_for_owner(
        &self,
        account_id: AccountId,
    ) -> U64 {
        let series_per_owner = self.series_per_owner.get(&account_id);
        if let Some(series_per_owner) = series_per_owner {
            U64(series_per_owner.len())
        } else {
            U64(0)
        }
    }

    pub fn series_per_owner(
        &self,
        account_id: AccountId,
        from_index: U64,
        limit: u64,
    ) -> Vec<Series> {
        let series_per_owner = self.series_per_owner.get(&account_id);
        let series = if let Some(series_per_owner) = series_per_owner {
            series_per_owner
        } else {
            return vec![];
        };
        let keys = series.as_vector();
        let start = u64::from(from_index);
        let end = min(start + limit, keys.len());
        (start..end)
            .map(|i| self.series_by_name.get(&keys.get(i).unwrap()).unwrap())
            .collect()
    }
}

#[ext_contract(ext_non_fungible_series_approval_receiver)]
trait NonFungibleSeriesApprovalReceiver {
    fn series_on_approve(&mut self, series_name: SeriesName, owner_id: AccountId, msg: String);
}
