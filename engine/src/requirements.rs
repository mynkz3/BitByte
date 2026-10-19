use std::collections::HashSet;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RequirementSuggestion {
    pub field: String,
    pub value: String,
    pub evidence_text: String,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ExtractedRequirements {
    pub suggestions: Vec<RequirementSuggestion>,
}

pub fn extract_requirements(text: &str) -> ExtractedRequirements {
    let lower = text.to_lowercase();
    let mut suggestions = Vec::new();
    let mut seen = HashSet::new();

    let rules = [
        (
            "modality",
            "image",
            &["image", "images", "visual", "retinal"] as &[&str],
        ),
        ("modality", "text", &["text", "nlp", "language", "document"]),
        ("modality", "audio", &["audio", "speech", "voice"]),
        ("modality", "video", &["video", "videos"]),
        (
            "modality",
            "time_series",
            &["time series", "temporal", "forecasting data"],
        ),
        (
            "modality",
            "graph",
            &["graph", "network", "nodes and edges"],
        ),
        (
            "task",
            "classification",
            &["classification", "classify", "categorization"],
        ),
        (
            "task",
            "regression",
            &["regression", "continuous prediction"],
        ),
        (
            "task",
            "detection",
            &["object detection", "detection", "localization"],
        ),
        ("task", "segmentation", &["segmentation", "pixel labeling"]),
        ("task", "forecasting", &["forecasting", "future prediction"]),
        ("task", "clustering", &["clustering", "grouping"]),
        (
            "domain",
            "medical",
            &["medical", "clinical", "healthcare", "disease"],
        ),
        ("domain", "climate", &["climate", "weather", "environment"]),
        ("domain", "finance", &["finance", "financial", "banking"]),
        (
            "domain",
            "agriculture",
            &["agriculture", "farming", "crops"],
        ),
        (
            "domain",
            "education",
            &["education", "student", "learning outcomes"],
        ),
        ("evaluation_metric", "accuracy", &["accuracy"]),
        ("evaluation_metric", "f1", &["f1", "f-score"]),
        ("evaluation_metric", "auroc", &["auroc", "roc auc"]),
        (
            "evaluation_metric",
            "rmse",
            &["rmse", "root mean squared error"],
        ),
        ("evaluation_metric", "mae", &["mae", "mean absolute error"]),
    ];

    for (field, value, aliases) in rules {
        for alias in aliases {
            let alias = *alias;
            if let Some(start) = lower.find(alias) {
                if seen.insert((field, value)) {
                    let end = start + alias.len();
                    let evidence_text = text
                        .get(start..end)
                        .map(ToOwned::to_owned)
                        .unwrap_or_else(|| alias.to_owned());
                    let confidence = if alias == value { 0.95 } else { 0.8 };
                    suggestions.push(RequirementSuggestion {
                        field: field.to_owned(),
                        value: value.to_owned(),
                        evidence_text,
                        confidence,
                    });
                }
                break;
            }
        }
    }

    suggestions.sort_by(|left, right| {
        left.field
            .cmp(&right.field)
            .then_with(|| left.value.cmp(&right.value))
    });
    ExtractedRequirements { suggestions }
}

#[cfg(test)]
mod tests {
    use super::extract_requirements;

    #[test]
    fn extracts_contextual_modalities_tasks_and_domains() {
        let result = extract_requirements(
            "We classify retinal images for a medical screening model and evaluate with F1.",
        );

        assert!(result
            .suggestions
            .iter()
            .any(|item| item.field == "modality" && item.value == "image"));
        assert!(result
            .suggestions
            .iter()
            .any(|item| item.field == "task" && item.value == "classification"));
        assert!(result
            .suggestions
            .iter()
            .any(|item| item.field == "domain" && item.value == "medical"));
        assert!(result
            .suggestions
            .iter()
            .any(|item| item.field == "evaluation_metric" && item.value == "f1"));
    }

    #[test]
    fn does_not_duplicate_a_requirement_when_multiple_aliases_match() {
        let result = extract_requirements("Image and visual data for classification.");
        let image_matches = result
            .suggestions
            .iter()
            .filter(|item| item.field == "modality" && item.value == "image")
            .count();

        assert_eq!(image_matches, 1);
    }
}
