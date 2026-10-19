use std::cmp::Ordering;

use serde::{Deserialize, Serialize};

use crate::index::TextIndex;
use crate::model::{CatalogArtifact, DatasetRecord, MatchGroup, QueryRequirements, ResearchQuery};
use crate::tokenizer::canonical;

#[derive(Debug, Clone)]
pub struct RankingEngine {
    artifact: CatalogArtifact,
    index: TextIndex,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ScoreBreakdown {
    pub text_relevance: f64,
    pub task_compatibility: f64,
    pub modality_compatibility: f64,
    pub domain_target_match: f64,
    pub constraint_satisfaction: f64,
    pub evaluation_readiness: f64,
    pub quality_practical_fit: f64,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ExplanationItem {
    pub category: String,
    pub tone: String,
    pub text: String,
    pub contribution: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RankedResult {
    pub dataset: DatasetRecord,
    pub score: f64,
    pub score_breakdown: ScoreBreakdown,
    pub matched_requirements: Vec<String>,
    pub unverified_requirements: Vec<String>,
    pub explanation_items: Vec<ExplanationItem>,
}

impl RankingEngine {
    pub fn from_catalog(artifact: CatalogArtifact) -> Result<Self, String> {
        if artifact.records.is_empty() {
            return Err("catalog must contain at least one dataset".to_owned());
        }

        let index = TextIndex::build(&artifact);
        Ok(Self { artifact, index })
    }

    pub fn search(&self, query: &ResearchQuery, limit: usize) -> Result<Vec<RankedResult>, String> {
        if limit == 0 {
            return Ok(Vec::new());
        }

        let query_text = query_text(query);
        let raw_text_scores = self.index.raw_scores(&query_text);
        let max_text_score = raw_text_scores.iter().copied().fold(0.0, f64::max);
        let mut candidates = Vec::new();

        for (index, dataset) in self.artifact.records.iter().enumerate() {
            if !passes_hard_constraints(dataset, &query.requirements) {
                continue;
            }

            let breakdown = calculate_breakdown(
                dataset,
                query,
                normalize_text_score(raw_text_scores[index], max_text_score),
            );
            let explanation = explanations(dataset, query, &breakdown);
            let matched_requirements = matched_requirements(dataset, query);
            let unverified_requirements = unverified_requirements(dataset, query);

            candidates.push(RankedResult {
                dataset: dataset.clone(),
                score: breakdown.total * 100.0,
                score_breakdown: breakdown,
                matched_requirements,
                unverified_requirements,
                explanation_items: explanation,
            });
        }

        candidates.sort_by(|left, right| {
            right
                .score
                .partial_cmp(&left.score)
                .unwrap_or(Ordering::Equal)
                .then_with(|| left.dataset.identity.id.cmp(&right.dataset.identity.id))
        });
        candidates.truncate(limit);

        Ok(candidates)
    }

    pub fn search_json(&self, query_json: &str, limit: usize) -> Result<String, String> {
        let query: ResearchQuery =
            serde_json::from_str(query_json).map_err(|error| format!("invalid query: {error}"))?;
        let results = self.search(&query, limit)?;
        serde_json::to_string(&results)
            .map_err(|error| format!("could not serialize results: {error}"))
    }
}

fn query_text(query: &ResearchQuery) -> String {
    let groups = [
        &query.requirements.modalities,
        &query.requirements.tasks,
        &query.requirements.domains,
        &query.requirements.targets,
        &query.requirements.languages,
        &query.requirements.licenses,
    ];
    let mut parts = vec![query.source_text.clone()];
    for group in groups {
        parts.extend(group.must_have.iter().cloned());
        parts.extend(group.preferred.iter().cloned());
    }
    parts.join(" ")
}

fn normalize_text_score(raw_score: f64, maximum: f64) -> f64 {
    if maximum <= f64::EPSILON {
        0.0
    } else {
        (raw_score / maximum).clamp(0.0, 1.0)
    }
}

fn passes_hard_constraints(dataset: &DatasetRecord, requirements: &QueryRequirements) -> bool {
    let modality_values = &dataset.fit.modalities;
    let task_values = &dataset.fit.tasks;
    let domain_values = &dataset.fit.domains;
    let target_values = &dataset.fit.targets;
    let language_values = &dataset.fit.languages;
    let license_values = vec![
        dataset.practical.license.category.clone(),
        dataset
            .practical
            .license
            .spdx_id
            .clone()
            .unwrap_or_default(),
        dataset.practical.license.label.clone().unwrap_or_default(),
    ];

    if !group_passes(modality_values, &requirements.modalities)
        || !group_passes(task_values, &requirements.tasks)
        || !group_passes(domain_values, &requirements.domains)
        || !group_passes(target_values, &requirements.targets)
        || !group_passes(language_values, &requirements.languages)
        || !group_passes(&license_values, &requirements.licenses)
    {
        return false;
    }

    let split_available = [
        ("train", dataset.practical.splits.train),
        ("validation", dataset.practical.splits.validation),
        ("test", dataset.practical.splits.test),
    ];
    if requirements.required_splits.iter().any(|required| {
        !split_available
            .iter()
            .any(|(name, available)| name == required && *available)
    }) {
        return false;
    }

    let records = dataset.practical.size.records;
    if requirements
        .min_records
        .is_some_and(|minimum| records.is_none_or(|value| value < minimum))
        || requirements
            .max_records
            .is_some_and(|maximum| records.is_none_or(|value| value > maximum))
    {
        return false;
    }

    if requirements.only_verified && dataset.quality.availability_status != "reachable" {
        return false;
    }

    true
}

fn group_passes(values: &[String], group: &MatchGroup) -> bool {
    let normalized_values = values
        .iter()
        .map(|value| canonical(value))
        .collect::<Vec<_>>();
    let has_excluded = group.excluded.iter().any(|wanted| {
        normalized_values
            .iter()
            .any(|value| values_match(value, wanted))
    });
    let has_all_required = group.must_have.iter().all(|wanted| {
        normalized_values
            .iter()
            .any(|value| values_match(value, wanted))
    });

    !has_excluded && has_all_required
}

fn values_match(candidate: &str, wanted: &str) -> bool {
    let wanted = canonical(wanted);
    candidate == wanted || candidate.contains(&wanted) || wanted.contains(candidate)
}

fn group_score(values: &[String], group: &MatchGroup) -> f64 {
    let requested = group
        .must_have
        .iter()
        .chain(group.preferred.iter())
        .collect::<Vec<_>>();
    if requested.is_empty() {
        return 0.0;
    }

    let matched = requested
        .iter()
        .filter(|wanted| {
            values
                .iter()
                .map(|value| canonical(value))
                .any(|value| values_match(&value, wanted))
        })
        .count();
    matched as f64 / requested.len() as f64
}

fn calculate_breakdown(
    dataset: &DatasetRecord,
    query: &ResearchQuery,
    text_relevance: f64,
) -> ScoreBreakdown {
    let task_compatibility = group_score(&dataset.fit.tasks, &query.requirements.tasks);
    let modality_compatibility =
        group_score(&dataset.fit.modalities, &query.requirements.modalities);
    let domain_score = group_score(&dataset.fit.domains, &query.requirements.domains);
    let target_score = group_score(&dataset.fit.targets, &query.requirements.targets);
    let domain_target_match = average_non_empty([domain_score, target_score]);
    let constraint_satisfaction = constraint_score(dataset, &query.requirements);
    let evaluation_readiness = evaluation_score(dataset, &query.requirements);
    let quality_practical_fit = quality_score(dataset);

    let components = [
        (query.priorities.text_relevance, text_relevance),
        (query.priorities.task_compatibility, task_compatibility),
        (
            query.priorities.modality_compatibility,
            modality_compatibility,
        ),
        (query.priorities.domain_target_match, domain_target_match),
        (
            query.priorities.constraint_satisfaction,
            constraint_satisfaction,
        ),
        (query.priorities.evaluation_readiness, evaluation_readiness),
        (
            query.priorities.quality_practical_fit,
            quality_practical_fit,
        ),
    ];
    let weight_total = components.iter().map(|(weight, _)| weight).sum::<f64>();
    let total = if weight_total <= f64::EPSILON {
        0.0
    } else {
        components
            .iter()
            .map(|(weight, value)| weight * value)
            .sum::<f64>()
            / weight_total
    };

    ScoreBreakdown {
        text_relevance,
        task_compatibility,
        modality_compatibility,
        domain_target_match,
        constraint_satisfaction,
        evaluation_readiness,
        quality_practical_fit,
        total,
    }
}

fn average_non_empty(values: [f64; 2]) -> f64 {
    let present = values
        .iter()
        .filter(|value| **value > 0.0)
        .collect::<Vec<_>>();
    if present.is_empty() {
        0.0
    } else {
        present.iter().map(|value| **value).sum::<f64>() / present.len() as f64
    }
}

fn constraint_score(dataset: &DatasetRecord, requirements: &QueryRequirements) -> f64 {
    let mut satisfied = 0.0;
    let mut total = 0.0;

    for (values, group) in [
        (&dataset.fit.modalities, &requirements.modalities),
        (&dataset.fit.tasks, &requirements.tasks),
        (&dataset.fit.domains, &requirements.domains),
        (&dataset.fit.targets, &requirements.targets),
        (&dataset.fit.languages, &requirements.languages),
    ] {
        let count = group.must_have.len() + group.preferred.len();
        if count > 0 {
            total += count as f64;
            satisfied += group_score(values, group) * count as f64;
        }
    }

    for required_split in &requirements.required_splits {
        total += 1.0;
        if split_is_available(dataset, required_split) {
            satisfied += 1.0;
        }
    }

    if let Some(minimum) = requirements.min_records {
        total += 1.0;
        if dataset
            .practical
            .size
            .records
            .is_some_and(|records| records >= minimum)
        {
            satisfied += 1.0;
        }
    }
    if let Some(maximum) = requirements.max_records {
        total += 1.0;
        if dataset
            .practical
            .size
            .records
            .is_some_and(|records| records <= maximum)
        {
            satisfied += 1.0;
        }
    }

    if total <= f64::EPSILON {
        1.0
    } else {
        satisfied / total
    }
}

fn evaluation_score(dataset: &DatasetRecord, requirements: &QueryRequirements) -> f64 {
    if requirements.required_splits.is_empty() {
        return if dataset.practical.splits.train && dataset.practical.splits.test {
            1.0
        } else {
            0.5
        };
    }

    let available = requirements
        .required_splits
        .iter()
        .filter(|split| split_is_available(dataset, split))
        .count();
    available as f64 / requirements.required_splits.len() as f64
}

fn split_is_available(dataset: &DatasetRecord, split: &str) -> bool {
    match split {
        "train" => dataset.practical.splits.train,
        "validation" => dataset.practical.splits.validation,
        "test" => dataset.practical.splits.test,
        _ => false,
    }
}

fn quality_score(dataset: &DatasetRecord) -> f64 {
    let availability = match dataset.quality.availability_status.as_str() {
        "reachable" => 1.0,
        "restricted" => 0.6,
        "unavailable" => 0.0,
        _ => 0.4,
    };
    let access = match dataset.practical.access_type.as_str() {
        "public" => 1.0,
        "gated" => 0.7,
        "restricted" => 0.3,
        _ => 0.4,
    };
    dataset.quality.metadata_completeness * availability * access
}

fn matched_requirements(dataset: &DatasetRecord, query: &ResearchQuery) -> Vec<String> {
    let mut matches = Vec::new();
    if group_score(&dataset.fit.modalities, &query.requirements.modalities) > 0.0 {
        matches.push("modality".to_owned());
    }
    if group_score(&dataset.fit.tasks, &query.requirements.tasks) > 0.0 {
        matches.push("task".to_owned());
    }
    if group_score(&dataset.fit.domains, &query.requirements.domains) > 0.0 {
        matches.push("domain".to_owned());
    }
    if group_score(&dataset.fit.targets, &query.requirements.targets) > 0.0 {
        matches.push("target".to_owned());
    }
    matches
}

fn unverified_requirements(dataset: &DatasetRecord, query: &ResearchQuery) -> Vec<String> {
    let mut unverified = Vec::new();
    if !query.requirements.modalities.must_have.is_empty()
        && group_score(&dataset.fit.modalities, &query.requirements.modalities) < 1.0
    {
        unverified.push("modality".to_owned());
    }
    if !query.requirements.domains.preferred.is_empty()
        && group_score(&dataset.fit.domains, &query.requirements.domains) < 1.0
    {
        unverified.push("domain".to_owned());
    }
    if !query.requirements.targets.preferred.is_empty()
        && group_score(&dataset.fit.targets, &query.requirements.targets) < 1.0
    {
        unverified.push("target".to_owned());
    }
    if dataset.practical.license.category == "unknown" {
        unverified.push("license".to_owned());
    }
    unverified
}

fn explanations(
    dataset: &DatasetRecord,
    query: &ResearchQuery,
    breakdown: &ScoreBreakdown,
) -> Vec<ExplanationItem> {
    let mut items = Vec::new();
    add_match_explanation(
        &mut items,
        "modality",
        breakdown.modality_compatibility,
        "modality matches the research requirements",
        "modality is not reported as a match",
    );
    add_match_explanation(
        &mut items,
        "task",
        breakdown.task_compatibility,
        "task matches the research requirements",
        "task fit is not reported as a match",
    );
    add_match_explanation(
        &mut items,
        "domain",
        breakdown.domain_target_match,
        "domain or target matches the research requirements",
        "domain or target fit is not fully verified",
    );
    if breakdown.evaluation_readiness > 0.0 {
        items.push(ExplanationItem {
            category: "evaluation".to_owned(),
            tone: "positive".to_owned(),
            text: "evaluation splits are available or reported".to_owned(),
            contribution: breakdown.evaluation_readiness,
        });
    }
    if dataset.quality.metadata_completeness < 0.7 {
        items.push(ExplanationItem {
            category: "quality".to_owned(),
            tone: "warning".to_owned(),
            text: "metadata is incomplete".to_owned(),
            contribution: breakdown.quality_practical_fit,
        });
    }
    if !query.requirements.required_splits.is_empty() {
        items.push(ExplanationItem {
            category: "constraints".to_owned(),
            tone: "positive".to_owned(),
            text: "required dataset splits are present".to_owned(),
            contribution: breakdown.constraint_satisfaction,
        });
    }
    items
}

fn add_match_explanation(
    items: &mut Vec<ExplanationItem>,
    category: &str,
    score: f64,
    positive_text: &str,
    warning_text: &str,
) {
    if score > 0.0 {
        items.push(ExplanationItem {
            category: category.to_owned(),
            tone: "positive".to_owned(),
            text: positive_text.to_owned(),
            contribution: score,
        });
    } else {
        items.push(ExplanationItem {
            category: category.to_owned(),
            tone: "warning".to_owned(),
            text: warning_text.to_owned(),
            contribution: 0.0,
        });
    }
}
