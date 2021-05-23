use crate::*;

static PACKAGE_NAME_VERSION_DELIMETER: &str = "@";
pub type PackageNameVersion = String;

#[derive(BorshDeserialize, BorshSerialize)]
pub struct Package {
    pub src_hash: String,
    pub urls: Vec<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct PackageJson {
    pub name_version: PackageNameVersion,
    pub src_hash: String,
    pub urls: Vec<String>,
}

#[near_bindgen]
impl Contract {

    #[payable]
    pub fn add_package(
        &mut self,
        name_version: PackageNameVersion,
        src_hash: String,
        urls: Vec<String>,
    ) {
        assert_at_least_one_yocto();
        assert!(name_version.contains(PACKAGE_NAME_VERSION_DELIMETER), "Package name_version must be <package>@<version>");
        let mut name_version_split = name_version.split(PACKAGE_NAME_VERSION_DELIMETER);
        assert!(!name_version_split.next().unwrap().is_empty(), "Must specify a package name");
        assert!(!name_version_split.next().unwrap().is_empty(), "Must specify a package version");

        let initial_storage_usage = env::storage_usage();
    
        self.packages_by_name_version.insert(&name_version, &Package {
            src_hash,
            urls,
        });

        let required_storage_in_bytes = env::storage_usage().saturating_sub(initial_storage_usage);
        refund_deposit(required_storage_in_bytes, None);
    }

    #[payable]
    pub fn add_mirrors(
        &mut self,
        name_version: PackageNameVersion,
        urls: Vec<String>,
    ) {
        assert_at_least_one_yocto();
        let initial_storage_usage = env::storage_usage();
    
        let mut package = self.packages_by_name_version.get(&name_version).unwrap_or_else(|| panic!("No package {}", name_version));
        package.urls.extend(urls);

        let required_storage_in_bytes = env::storage_usage().saturating_sub(initial_storage_usage);
        refund_deposit(required_storage_in_bytes, None);
    }

    /// views

    pub fn get_package(
        &self,
        name_version: PackageNameVersion,
    ) -> PackageJson {
        let Package {
            src_hash,
            urls,
        } = self.packages_by_name_version.get(&name_version).unwrap_or_else(|| panic!("No package {}", name_version));
        PackageJson{
            name_version,
            src_hash,
            urls,
        }
    }

    pub fn get_package_range(
        &self,
        from_index: U64,
        limit: U64,
    ) -> Vec<PackageJson> {

        let mut tmp = vec![];
        let keys = self.packages_by_name_version.keys_as_vector();
        let start = u64::from(from_index);
        let end = min(start + u64::from(limit), keys.len());
        for i in start..end {
            let name_version = keys.get(i).unwrap();
            let Package {
                src_hash,
                urls,
            } = self.packages_by_name_version.get(&name_version).unwrap();
            tmp.push(PackageJson{
                name_version,
                src_hash,
                urls,
            });
        }
        tmp
    }

}

