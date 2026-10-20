use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CatalogArtifact {
    pub catalog_version: String,
    pub schema_version: String,
    pub records: Vec<DatasetRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DatasetRecord {
    pub identity: DatasetIdentity,
    pub content: DatasetContent,
    pub fit: DatasetFit,
    pub practical: DatasetPractical,
    pub quality: DatasetQuality,
    pub evidence: HashMap<String, Evidence>,
    pub provenance: DatasetProvenance,
}

impl DatasetRecord {
    pub fn validate(&self) -> Result<(), String> {
        validate_string_list("identity.aliases", &self.identity.aliases)?;
        validate_string_list("fit.subjects", &self.fit.subjects)?;
        validate_string_list("fit.data_objects", &self.fit.data_objects)?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DatasetIdentity {
    pub id: String,
    pub source: String,
    pub source_id: String,
    pub canonical_url: String,
    pub alternate_urls: Vec<String>,
    pub aliases: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DatasetContent {
    pub title: String,
    pub summary: String,
    pub search_text: String,
    pub tags: Vec<String>,
    pub citation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DatasetFit {
    pub modalities: Vec<String>,
    pub tasks: Vec<String>,
    pub domains: Vec<String>,
    pub subjects: Vec<String>,
    pub data_objects: Vec<String>,
    pub targets: Vec<String>,
    pub languages: Vec<String>,
    pub geography: Vec<String>,
    pub time_range: TimeRange,
    pub annotation_types: Vec<String>,
    pub attributes: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TimeRange {
    pub start: Option<String>,
    pub end: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DatasetPractical {
    pub size: DatasetSize,
    pub splits: DatasetSplits,
    pub license: DatasetLicense,
    pub access_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DatasetSize {
    pub bytes: Option<u64>,
    pub records: Option<u64>,
    pub features: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DatasetSplits {
    pub train: bool,
    pub validation: bool,
    pub test: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DatasetLicense {
    pub spdx_id: Option<String>,
    pub label: Option<String>,
    pub url: Option<String>,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DatasetQuality {
    pub metadata_completeness: f64,
    pub availability_status: String,
    pub warnings: Vec<String>,
    pub last_verified_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Evidence {
    pub evidence_type: String,
    pub evidence_text: Option<String>,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DatasetProvenance {
    pub adapter_version: String,
    pub extracted_at: String,
    pub source_updated_at: Option<String>,
    pub schema_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ResearchQuery {
    pub source_text: String,
    pub requirements: QueryRequirements,
    pub priorities: QueryPriorities,
    pub context: QueryContext,
}

impl ResearchQuery {
    pub fn validate(&self) -> Result<(), String> {
        self.requirements
            .subjects
            .validate("requirements.subjects")?;
        self.requirements
            .data_objects
            .validate("requirements.data_objects")?;
        let mut named_datasets = HashSet::with_capacity(self.requirements.named_datasets.len());
        for (index, named_dataset) in self.requirements.named_datasets.iter().enumerate() {
            named_dataset.validate(&format!("requirements.named_datasets[{index}]"))?;
            if !named_datasets.insert((&named_dataset.name, &named_dataset.role)) {
                return Err("requirements.named_datasets values must be unique".to_owned());
            }
        }
        self.context.validate("context")?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct QueryRequirements {
    pub modalities: MatchGroup,
    pub tasks: MatchGroup,
    pub domains: MatchGroup,
    pub subjects: MatchGroup,
    pub data_objects: MatchGroup,
    pub targets: MatchGroup,
    pub languages: MatchGroup,
    pub licenses: MatchGroup,
    pub named_datasets: Vec<NamedDatasetReference>,
    pub required_splits: Vec<String>,
    pub min_records: Option<u64>,
    pub max_records: Option<u64>,
    pub only_verified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum NamedDatasetRole {
    Anchor,
    Comparison,
    ContextOnly,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NamedDatasetReference {
    pub name: String,
    pub role: NamedDatasetRole,
}

impl NamedDatasetReference {
    fn validate(&self, field: &str) -> Result<(), String> {
        if self.name.is_empty() {
            return Err(format!("{field}.name must be non-empty"));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct QueryContext {
    pub goals: Vec<String>,
    pub frameworks: Vec<String>,
    pub models: Vec<String>,
    pub metrics: Vec<String>,
}

impl QueryContext {
    fn validate(&self, field: &str) -> Result<(), String> {
        validate_string_list(&format!("{field}.goals"), &self.goals)?;
        validate_string_list(&format!("{field}.frameworks"), &self.frameworks)?;
        validate_string_list(&format!("{field}.models"), &self.models)?;
        validate_string_list(&format!("{field}.metrics"), &self.metrics)?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MatchGroup {
    pub must_have: Vec<String>,
    pub preferred: Vec<String>,
    pub excluded: Vec<String>,
}

impl MatchGroup {
    fn validate(&self, field: &str) -> Result<(), String> {
        validate_string_list(&format!("{field}.must_have"), &self.must_have)?;
        validate_string_list(&format!("{field}.preferred"), &self.preferred)?;
        validate_string_list(&format!("{field}.excluded"), &self.excluded)?;
        Ok(())
    }
}

fn validate_string_list(field: &str, values: &[String]) -> Result<(), String> {
    let mut seen = HashSet::with_capacity(values.len());
    for value in values {
        if value.is_empty() {
            return Err(format!("{field} values must be non-empty"));
        }
        if !seen.insert(value) {
            return Err(format!("{field} values must be unique"));
        }
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct QueryPriorities {
    pub text_relevance: f64,
    pub task_compatibility: f64,
    pub modality_compatibility: f64,
    pub domain_target_match: f64,
    pub constraint_satisfaction: f64,
    pub evaluation_readiness: f64,
    pub quality_practical_fit: f64,
}
