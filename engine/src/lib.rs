pub mod index;
pub mod model;
pub mod ranking;
pub mod requirements;
pub mod tokenizer;

use wasm_bindgen::prelude::*;

use ranking::RankingEngine;

#[wasm_bindgen]
pub struct SearchEngine {
    inner: RankingEngine,
}

#[wasm_bindgen]
impl SearchEngine {
    #[wasm_bindgen(js_name = fromCatalog)]
    pub fn from_catalog(catalog_json: &str) -> Result<SearchEngine, JsValue> {
        let artifact = serde_json::from_str(catalog_json)
            .map_err(|error| JsValue::from_str(&format!("invalid catalog: {error}")))?;
        let inner =
            RankingEngine::from_catalog(artifact).map_err(|error| JsValue::from_str(&error))?;
        Ok(Self { inner })
    }

    #[wasm_bindgen(js_name = search)]
    pub fn search(&self, query_json: &str, limit: usize) -> Result<String, JsValue> {
        self.inner
            .search_json(query_json, limit)
            .map_err(|error| JsValue::from_str(&error))
    }

    #[wasm_bindgen(js_name = engineVersion)]
    pub fn engine_version() -> String {
        "0.1.0".to_owned()
    }

    #[wasm_bindgen(js_name = extractRequirements)]
    pub fn extract_requirements(text: &str) -> String {
        serde_json::to_string(&requirements::extract_requirements(text))
            .expect("requirement suggestions should serialize")
    }
}
