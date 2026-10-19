pub mod index;
pub mod model;
pub mod ranking;
pub mod requirements;
pub mod tokenizer;

use js_sys::Float64Array;
use ranking::RankingEngine;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct SearchEngine;

#[wasm_bindgen]
impl SearchEngine {
    #[wasm_bindgen(js_name = engineVersion)]
    pub fn engine_version() -> String {
        "0.1.0".to_owned()
    }

    #[wasm_bindgen(js_name = extractRequirements)]
    pub fn extract_requirements(text: &str) -> String {
        serde_json::to_string(&requirements::extract_requirements(text))
            .expect("requirement suggestions should serialize")
    }

    #[wasm_bindgen(js_name = searchCatalog)]
    pub fn search_catalog(catalog_json: &str, query_json: &str, limit: u32) -> Float64Array {
        let artifact = match serde_json::from_str(catalog_json) {
            Ok(artifact) => artifact,
            Err(_) => return Float64Array::new_with_length(0),
        };
        let query = match serde_json::from_str(query_json) {
            Ok(query) => query,
            Err(_) => return Float64Array::new_with_length(0),
        };
        let engine = match RankingEngine::from_catalog(artifact) {
            Ok(engine) => engine,
            Err(_) => return Float64Array::new_with_length(0),
        };
        let results = match engine.search_numeric(&query, limit as usize) {
            Ok(results) => results,
            Err(_) => return Float64Array::new_with_length(0),
        };
        let flat = results
            .into_iter()
            .flat_map(|hit| hit.into_iter())
            .collect::<Vec<_>>();
        Float64Array::from(flat.as_slice())
    }
}
