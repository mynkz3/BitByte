use std::collections::HashMap;

use bitbyte_engine::model::{
    CatalogArtifact, DatasetRecord, DatasetSize, DatasetSplits, MatchGroup, QueryPriorities,
    ResearchQuery,
};
use bitbyte_engine::ranking::RankingEngine;

fn dataset_fixture() -> DatasetRecord {
    serde_json::from_str(include_str!(
        "../../catalog_builder/tests/fixtures/valid_dataset.json"
    ))
    .expect("dataset fixture should deserialize")
}

fn query_fixture() -> ResearchQuery {
    serde_json::from_str(include_str!(
        "../../catalog_builder/tests/fixtures/valid_query.json"
    ))
    .expect("query fixture should deserialize")
}

fn text_dataset() -> DatasetRecord {
    let mut dataset = dataset_fixture();
    dataset.identity.id = "openml:demo-text".to_owned();
    dataset.identity.source = "openml".to_owned();
    dataset.identity.source_id = "demo-text".to_owned();
    dataset.identity.canonical_url = "https://www.openml.org/d/demo-text".to_owned();
    dataset.content.title = "Demo Text Classification Dataset".to_owned();
    dataset.content.summary = "Text sentiment classification dataset.".to_owned();
    dataset.content.search_text = "text sentiment classification".to_owned();
    dataset.content.tags = vec!["text".to_owned(), "classification".to_owned()];
    dataset.fit.modalities = vec!["text".to_owned()];
    dataset.fit.domains = vec!["social_science".to_owned()];
    dataset.fit.targets = vec!["sentiment".to_owned()];
    dataset.practical.size = DatasetSize {
        bytes: Some(800_000),
        records: Some(900),
        features: Some(2),
    };
    dataset.practical.splits = DatasetSplits {
        train: true,
        validation: false,
        test: true,
    };
    dataset.evidence = HashMap::new();
    dataset
}

fn engine() -> RankingEngine {
    RankingEngine::from_catalog(CatalogArtifact {
        catalog_version: "test".to_owned(),
        schema_version: "0.1.0".to_owned(),
        records: vec![dataset_fixture(), text_dataset()],
    })
    .expect("test catalog should build")
}

#[test]
fn context_and_bm25_rank_the_matching_modality_first() {
    let results = engine()
        .search(&query_fixture(), 10)
        .expect("search should work");

    assert_eq!(results.len(), 1);
    assert_eq!(
        results[0].dataset.identity.id,
        "huggingface:bitbyte/demo-image"
    );
    assert!(results[0].score > 0.0);
}

#[test]
fn hard_modality_constraints_exclude_incompatible_records() {
    let mut query = query_fixture();
    query.requirements.modalities = MatchGroup {
        must_have: vec!["audio".to_owned()],
        preferred: vec![],
        excluded: vec![],
    };

    let results = engine().search(&query, 10).expect("search should work");

    assert!(results.is_empty());
}

#[test]
fn explanations_are_generated_from_score_contributions() {
    let results = engine()
        .search(&query_fixture(), 10)
        .expect("search should work");
    let result = &results[0];

    assert!(!result.explanation_items.is_empty());
    assert!(result
        .explanation_items
        .iter()
        .any(|item| item.text.contains("modality")));
    assert!(result.score_breakdown.total >= 0.0);
}

#[test]
fn priority_weights_change_the_score_without_changing_hard_filters() {
    let mut query = query_fixture();
    query.priorities = QueryPriorities {
        text_relevance: 1.0,
        task_compatibility: 0.0,
        modality_compatibility: 0.0,
        domain_target_match: 0.0,
        constraint_satisfaction: 0.0,
        evaluation_readiness: 0.0,
        quality_practical_fit: 0.0,
    };

    let results = engine().search(&query, 10).expect("search should work");

    assert_eq!(results.len(), 1);
    assert!(results[0].score_breakdown.text_relevance >= 0.0);
}

#[test]
fn json_search_bridge_serializes_ranked_results() {
    let json = engine()
        .search_json(&serde_json::to_string(&query_fixture()).unwrap(), 10)
        .expect("JSON search should serialize");
    let results: Vec<serde_json::Value> =
        serde_json::from_str(&json).expect("serialized search should be valid JSON");

    assert_eq!(results.len(), 1);
    assert_eq!(
        results[0]["dataset"]["identity"]["id"],
        "huggingface:bitbyte/demo-image"
    );
}
