use crate::*;

static PACKAGE_NAME_VERSION_DELIMETER: &str = "@";

pub type PackageType = String;

#[derive(BorshDeserialize, BorshSerialize)]
#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Package {
    pub name: String,
    pub version: String,
    pub src_hash: String,
    pub urls: Vec<String>,
}

#[near_bindgen]
impl Contract {

    #[payable]
    pub fn add_package(
        &mut self,
        name: String,
        version: String,
        src_hash: String,
        urls: Vec<String>,
    ) {
        assert_at_least_one_yocto();

        let initial_storage_usage = env::storage_usage();
        let name_version = format!("{}{}{}", name, PACKAGE_NAME_VERSION_DELIMETER, version);
    
        self.packages_by_name_version.insert(&name_version, &Package {
            name,
            version,
            src_hash,
            urls,
        });

        let used_storage = env::storage_usage() - initial_storage_usage;
        let required_storage_in_bytes = used_storage;
        refund_deposit(required_storage_in_bytes);
    }

    #[payable]
    pub fn add_mirrors(
        &mut self,
        name: String,
        version: String,
        urls: Vec<String>,
    ) {
        assert_at_least_one_yocto();
        let initial_storage_usage = env::storage_usage();
        let name_version = format!("{}{}{}", name, PACKAGE_NAME_VERSION_DELIMETER, version);
    
        let mut package = self.packages_by_name_version.get(&name_version).expect(&format!("No package {}", name_version));
        package.urls.extend(urls);

        let used_storage = env::storage_usage() - initial_storage_usage;
        let required_storage_in_bytes = used_storage;
        refund_deposit(required_storage_in_bytes);
    }

    /// views

    pub fn get_package(
        &self,
        name_version: String,
    ) -> Package {
        self.packages_by_name_version.get(&name_version).expect(&format!("No package {}", name_version))
    }

    pub fn get_packages(
        &self,
        from_index: U64,
        limit: U64,
    ) -> Vec<Package> {

        let mut tmp = vec![];
        let keys = self.packages_by_name_version.keys_as_vector();
        let start = u64::from(from_index);
        let end = min(start + u64::from(limit), keys.len());
        for i in start..end {
            tmp.push(self.packages_by_name_version.get(&keys.get(i).unwrap()).unwrap());
        }
        tmp
    }

}

