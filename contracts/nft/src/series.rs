use crate::*;

pub type SeriesName = String;
pub type OwnerArgs = HashMap<String, String>;

#[derive(BorshDeserialize, BorshSerialize)]
#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SeriesMintArgs {
    pub series_name: String,
    pub mint: Vec<String>,
    pub owner: Vec<String>,
    pub perpetual_royalties: Option<HashMap<AccountId, u32>>,
    pub receiver_id: Option<ValidAccountId>,
}

#[derive(BorshDeserialize, BorshSerialize)]
#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SeriesArgs {
    pub series_name: String,
    pub mint: Vec<String>,
    pub owner: Vec<String>,
}

#[derive(BorshDeserialize, BorshSerialize)]
#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SeriesParams {
    pub max_supply: U64,
    pub enforce_unique_args: bool,
    pub mint: Vec<String>,
    pub owner: Vec<String>,
    pub packages: Vec<String>,
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct Series {
    pub series_name: String,
    pub src: String,
    pub bytes: U64,
    pub royalty: HashMap<AccountId, u32>,
    pub owner_id: AccountId,
    pub approved_account_ids: UnorderedSet<AccountId>,
    pub created_at: U64,
    pub params: SeriesParams,
}


#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SeriesJson {
    pub series_name: String,
    pub src: String,
    pub bytes: U64,
    pub royalty: HashMap<AccountId, u32>,
    pub owner_id: AccountId,
    pub approved_account_ids: Vec<AccountId>,
    pub created_at: U64,
    pub params: SeriesParams,
}

#[near_bindgen]
impl Contract {

    #[payable]
    pub fn series_create_and_approve (
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
        
        let mut series = self.series_by_name.get(&series_name).expect("Not valid series");
        assert_eq!(series.owner_id, env::predecessor_account_id(), "Must be series owner");

        series.approved_account_ids.insert(account_id.as_ref());

        let storage_used = bytes.0 + env::storage_usage() - initial_storage_usage;

        if let Some(msg) = msg {
            ext_non_fungible_series_approval_receiver::series_on_approve(
                series_name,
                series.owner_id,
                msg,
                account_id.as_ref(),
                env::attached_deposit().saturating_sub(env::storage_byte_cost() * Balance::from(storage_used)),
                env::prepaid_gas() - GAS_FOR_SERIES_APPROVE,
            );
        }
    }

    #[payable]
    pub fn series_create (
        &mut self,
        series_name: String,
        bytes: U64,
        params: SeriesParams,
        royalty: Option<HashMap<AccountId, u32>>,
    ) {
        assert_at_least_one_yocto();
        let initial_storage_usage = env::storage_usage();

        self.series_create_internal(series_name, bytes, params, royalty);

        let required_storage_in_bytes = bytes.0 + env::storage_usage() - initial_storage_usage;
        refund_deposit(required_storage_in_bytes, None);
    }

    fn series_create_internal(
        &mut self,
        series_name: String,
        bytes: U64,
        params: SeriesParams,
        royalty: Option<HashMap<AccountId, u32>>,
    ) {
        let owner_id = env::predecessor_account_id();

        assert!(self.series_by_name.insert(&series_name, &Series {
            series_name: series_name.clone(),
            src: "".to_string(),
            bytes,
            royalty: royalty.unwrap_or_default(),
            owner_id: owner_id.clone(),
            created_at: env::block_timestamp().into(),
            params,
            approved_account_ids: UnorderedSet::new(
                StorageKey::SeriesApprovedIds {
                    series_name_hash: hash_account_id(&series_name),
                }
                .try_to_vec()
                .unwrap(),
            )
        }).is_none(), "Series with this name already exists");

        let mut series_per_owner = self.series_per_owner
            .get(&owner_id)
            .unwrap_or_else(|| {
                UnorderedSet::new(
                    StorageKey::SeriesPerOwnerInner {
                        account_id_hash: hash_account_id(&owner_id),
                    }
                    .try_to_vec()
                    .unwrap(),
                )
            });
        series_per_owner.insert(&series_name);
        self.series_per_owner.insert(&owner_id, &series_per_owner);
    }

    #[payable]
    pub fn series_approve (
        &mut self,
        series_name: String,
        account_id: ValidAccountId,
        msg: Option<String>,
    ) {
        assert_at_least_one_yocto();
        let initial_storage_usage = env::storage_usage();

        let mut series = self.series_by_name.get(&series_name).expect("Not valid series");
        assert_eq!(series.owner_id, env::predecessor_account_id(), "Must be series owner");

        series.approved_account_ids.insert(account_id.as_ref());

        let storage_used = env::storage_usage() - initial_storage_usage;

        if let Some(msg) = msg {
            ext_non_fungible_series_approval_receiver::series_on_approve(
                series_name,
                series.owner_id,
                msg,
                account_id.as_ref(),
                env::attached_deposit().saturating_sub(env::storage_byte_cost() * Balance::from(storage_used)),
                env::prepaid_gas() - GAS_FOR_SERIES_APPROVE,
            )
            .as_return(); // Returning this promise
        }
    }

    pub fn series_update(
        &mut self,
        series_name: String,
        src: String,
    ) {
        let mut series = self.series_by_name.get(&series_name).unwrap_or_else(|| panic!("No series {}", series_name));
        assert_eq!(series.owner_id, env::predecessor_account_id(), "Must be series owner");
        assert!(series.src.is_empty(), "Cannot set src twice");
        assert_eq!(series.bytes.0, src.len() as u64, "Must be exactly the same bytes");
        series.src = src;
        self.series_by_name.insert(&series_name, &series);
    }

    /// token specific methods because they are part of this series
    
    #[payable]
    pub fn update_token_owner_args(
        &mut self,
        token_id: TokenId,
        owner_args: OwnerArgs,
    ) {
        assert_at_least_one_yocto();
        let initial_storage_usage = env::storage_usage();
    
        let mut token_data = self.token_data_by_id.get(&token_id).unwrap_or_else(|| panic!("No token {}", token_id));
        let series = self.series_by_name.get(&token_data.series_args.series_name)
            .unwrap_or_else(|| panic!("No series {}", token_data.series_args.series_name));

        for (name, value) in &owner_args {
            let index = series.params.owner.iter().position(|v| v == name);
            if index.is_none() {
                log!("Skipping: {}. This is not a parameter of series: {}", name, token_data.series_args.series_name);
                continue;
            }
            token_data.series_args.owner[index.unwrap()] = value.clone();
            self.token_data_by_id.insert(&token_id, &token_data);
        }

        let required_storage_in_bytes = env::storage_usage().saturating_sub(initial_storage_usage);
        refund_deposit(required_storage_in_bytes, None);
    }
    

    /// views

    pub fn series_supply(
        &self,
    ) -> U64 {
        U64(self.series_by_name.keys_as_vector().len())
    }

    pub fn series_data(
        &self,
        series_name: SeriesName,
    ) -> SeriesJson {
        series_to_json(self.series_by_name.get(&series_name).unwrap_or_else(|| panic!("No series {}", series_name)))
    }

    pub fn series_range(
        &self,
        from_index: U64,
        limit: U64,
    ) -> Vec<SeriesJson> {
        let mut tmp = vec![];
        let keys = self.series_by_name.keys_as_vector();
        let start = u64::from(from_index);
        let end = min(start + u64::from(limit), keys.len());
        for i in start..end {
            tmp.push(series_to_json(self.series_by_name.get(&keys.get(i).unwrap()).unwrap()))
        }
        tmp
    }

    pub fn series_batch(
        &self,
        series_names: Vec<String>
    ) -> Vec<SeriesJson> {
        let mut tmp = vec![];
        for series_name in series_names {
            tmp.push(series_to_json(self.series_by_name.get(&series_name).unwrap()))
        }
        tmp
    }

    pub fn series_per_owner(
        &self,
        account_id: AccountId,
        from_index: U64,
        limit: U64,
    ) -> Vec<SeriesJson> {
        let mut tmp = vec![];
        let series_per_owner = self.series_per_owner.get(&account_id);
        let series = if let Some(series_per_owner) = series_per_owner {
            series_per_owner
        } else {
            return vec![];
        };
        let keys = series.as_vector();
        let start = u64::from(from_index);
        let end = min(start + u64::from(limit), keys.len());
        for i in start..end {
            tmp.push(series_to_json(self.series_by_name.get(&keys.get(i).unwrap()).unwrap()))
        }
        tmp
    }
}

fn series_to_json (series: Series) -> SeriesJson {
    let Series {
        series_name,
        src,
        bytes,
        royalty,
        owner_id,
        approved_account_ids,
        created_at,
        params,
    } = series;
    SeriesJson {
        series_name,
        src,
        bytes,
        royalty,
        owner_id,
        approved_account_ids: approved_account_ids.to_vec(),
        created_at,
        params,
    }
}

#[ext_contract(ext_non_fungible_series_approval_receiver)]
trait NonFungibleSeriesApprovalReceiver {
    fn series_on_approve(
        &mut self,
        series_name: SeriesName,
        owner_id: AccountId,
        msg: String,
    );
}