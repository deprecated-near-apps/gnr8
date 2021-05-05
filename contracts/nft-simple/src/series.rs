use crate::*;

pub type SeriesName = String;

#[derive(Clone)]
#[derive(BorshDeserialize, BorshSerialize)]
#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SeriesArgs {
    pub name: String,
    pub mint: Vec<String>,
    pub owner: Vec<String>,
}

#[derive(BorshDeserialize, BorshSerialize)]
#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct SeriesParams {
    pub supply_limit: U64,
    pub mint: Vec<String>,
    pub owner: Vec<String>,
    pub packages: Vec<String>,
}

#[derive(BorshDeserialize, BorshSerialize)]
#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Series {
    pub src: String,
    pub params: SeriesParams,
}

#[near_bindgen]
impl Contract {

    #[payable]
    pub fn create_series(
        &mut self,
        name: String,
        src: String,
        params: SeriesParams,
    ) {
        assert_at_least_one_yocto();

        let initial_storage_usage = env::storage_usage();
    
        self.series_by_name.insert(&name, &Series {
            src,
            params,
        });

        let used_storage = env::storage_usage() - initial_storage_usage;
        let required_storage_in_bytes = used_storage;
        refund_deposit(required_storage_in_bytes);
    }

    /// views

    pub fn get_series(
        &self,
        name: SeriesName,
    ) -> Series {
        self.series_by_name.get(&name).unwrap_or_else(|| panic!("No series {}", name))
    }

    pub fn get_series_range(
        &self,
        from_index: U64,
        limit: U64,
    ) -> Vec<Series> {

        let mut tmp = vec![];
        let keys = self.packages_by_name_version.keys_as_vector();
        let start = u64::from(from_index);
        let end = min(start + u64::from(limit), keys.len());
        for i in start..end {
            tmp.push(self.series_by_name.get(&keys.get(i).unwrap()).unwrap());
        }
        tmp
    }

}

