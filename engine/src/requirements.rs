use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RequirementSpan {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RequirementSuggestion {
    pub field: String,
    pub value: String,
    pub evidence_text: String,
    pub confidence: f64,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub section: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
    pub span: RequirementSpan,
    #[serde(default)]
    pub span_start: usize,
    #[serde(default)]
    pub span_end: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ExtractedRequirements {
    pub suggestions: Vec<RequirementSuggestion>,
}

struct Rule {
    field: &'static str,
    value: &'static str,
    aliases: &'static [&'static str],
    confidence: f64,
}

struct DatasetRule {
    canonical: &'static str,
    aliases: &'static [&'static str],
}

const DATASET_RULES: &[DatasetRule] = &[
    DatasetRule {
        canonical: "ESOL",
        aliases: &["ESOL", "Delaney solubility", "Delaney"],
    },
    DatasetRule {
        canonical: "BACE",
        aliases: &["BACE", "BACE classification"],
    },
    DatasetRule {
        canonical: "Lipophilicity",
        aliases: &["Lipophilicity", "Delaney lipophilicity"],
    },
    DatasetRule {
        canonical: "BBBP",
        aliases: &["BBBP", "blood-brain barrier penetration"],
    },
    DatasetRule {
        canonical: "Tox21",
        aliases: &["Tox21", "Tox-21"],
    },
    DatasetRule {
        canonical: "ClinTox",
        aliases: &["ClinTox", "Clin-Tox", "clinical toxicity"],
    },
    DatasetRule {
        canonical: "HIV",
        aliases: &["HIV", "HIV inhibition"],
    },
    DatasetRule {
        canonical: "SIDER",
        aliases: &["SIDER", "side effect resource"],
    },
    DatasetRule {
        canonical: "QM7",
        aliases: &["QM7", "QM-7"],
    },
    DatasetRule {
        canonical: "QM8",
        aliases: &["QM8", "QM-8"],
    },
    DatasetRule {
        canonical: "QM9",
        aliases: &["QM9", "QM-9"],
    },
    DatasetRule {
        canonical: "Breast Cancer Wisconsin (Diagnostic)",
        aliases: &[
            "Breast Cancer Wisconsin (Diagnostic)",
            "Breast Cancer Wisconsin",
            "WDBC",
            "Wisconsin Diagnostic Breast Cancer",
        ],
    },
    DatasetRule {
        canonical: "Iris",
        aliases: &["Iris", "Iris flower", "Iris species", "Fisher Iris"],
    },
];

const RULES: &[Rule] = &[
    Rule {
        field: "modality",
        value: "image",
        aliases: &["images", "image", "visual", "retinal", "photographs"],
        confidence: 0.95,
    },
    Rule {
        field: "modality",
        value: "text",
        aliases: &["text", "nlp", "language", "documents", "document"],
        confidence: 0.95,
    },
    Rule {
        field: "modality",
        value: "audio",
        aliases: &["audio", "speech", "voice"],
        confidence: 0.95,
    },
    Rule {
        field: "modality",
        value: "video",
        aliases: &["videos", "video"],
        confidence: 0.95,
    },
    Rule {
        field: "modality",
        value: "time_series",
        aliases: &["time series", "temporal", "forecasting data"],
        confidence: 0.95,
    },
    Rule {
        field: "modality",
        value: "graph",
        aliases: &["nodes and edges", "graph", "network"],
        confidence: 0.9,
    },
    Rule {
        field: "modality",
        value: "tabular",
        aliases: &["tabular", "table", "tables", "csv", "spreadsheet"],
        confidence: 0.95,
    },
    Rule {
        field: "task",
        value: "classification",
        aliases: &[
            "classification",
            "classify",
            "categorization",
            "categorisation",
        ],
        confidence: 0.95,
    },
    Rule {
        field: "task",
        value: "regression",
        aliases: &["regression", "continuous prediction", "numeric prediction"],
        confidence: 0.95,
    },
    Rule {
        field: "task",
        value: "detection",
        aliases: &[
            "object detection",
            "detection",
            "localization",
            "localisation",
        ],
        confidence: 0.95,
    },
    Rule {
        field: "task",
        value: "segmentation",
        aliases: &["segmentation", "pixel labeling", "pixel labelling"],
        confidence: 0.95,
    },
    Rule {
        field: "task",
        value: "forecasting",
        aliases: &["forecasting", "future prediction"],
        confidence: 0.95,
    },
    Rule {
        field: "task",
        value: "clustering",
        aliases: &["clustering", "grouping"],
        confidence: 0.95,
    },
    Rule {
        field: "domain",
        value: "medical",
        aliases: &["medical", "clinical", "healthcare", "disease"],
        confidence: 0.9,
    },
    Rule {
        field: "domain",
        value: "climate",
        aliases: &["climate", "weather", "environment"],
        confidence: 0.9,
    },
    Rule {
        field: "domain",
        value: "finance",
        aliases: &["finance", "financial", "banking"],
        confidence: 0.9,
    },
    Rule {
        field: "domain",
        value: "agriculture",
        aliases: &["agriculture", "farming", "crops"],
        confidence: 0.9,
    },
    Rule {
        field: "domain",
        value: "education",
        aliases: &["education", "student", "learning outcomes"],
        confidence: 0.9,
    },
    Rule {
        field: "subject",
        value: "chemistry",
        aliases: &[
            "chemistry",
            "chemical science",
            "chemical sciences",
            "molecular science",
        ],
        confidence: 0.88,
    },
    Rule {
        field: "subject",
        value: "molecular_property_prediction",
        aliases: &[
            "molecular property prediction",
            "molecule property prediction",
        ],
        confidence: 0.95,
    },
    Rule {
        field: "subject",
        value: "animals",
        aliases: &["animals", "animal"],
        confidence: 0.82,
    },
    Rule {
        field: "subject",
        value: "cats",
        aliases: &["cats", "cat", "felines", "feline"],
        confidence: 0.95,
    },
    Rule {
        field: "subject",
        value: "medical",
        aliases: &["medical", "medicine", "clinical", "healthcare"],
        confidence: 0.92,
    },
    Rule {
        field: "subject",
        value: "plants",
        aliases: &["plants", "plant", "botany", "flowers", "flower"],
        confidence: 0.88,
    },
    Rule {
        field: "data_object",
        value: "molecule",
        aliases: &[
            "molecules",
            "molecule",
            "chemical compound",
            "compounds",
            "compound",
        ],
        confidence: 0.92,
    },
    Rule {
        field: "data_object",
        value: "molecular_graph",
        aliases: &["molecular graphs", "molecular graph"],
        confidence: 0.95,
    },
    Rule {
        field: "data_object",
        value: "image",
        aliases: &["images", "image"],
        confidence: 0.84,
    },
    Rule {
        field: "data_object",
        value: "cat",
        aliases: &["cats", "cat"],
        confidence: 0.9,
    },
    Rule {
        field: "data_object",
        value: "patient_record",
        aliases: &["patient records", "patient record", "clinical record"],
        confidence: 0.92,
    },
    Rule {
        field: "data_object",
        value: "plant_measurement",
        aliases: &["plant measurements", "flower measurements"],
        confidence: 0.92,
    },
    Rule {
        field: "target",
        value: "molecular_property",
        aliases: &["molecular property", "molecule property"],
        confidence: 0.76,
    },
    Rule {
        field: "target",
        value: "diagnosis",
        aliases: &["diagnosis", "diagnostic outcome"],
        confidence: 0.92,
    },
    Rule {
        field: "target",
        value: "species",
        aliases: &["species", "flower species"],
        confidence: 0.92,
    },
    Rule {
        field: "framework",
        value: "gnn",
        aliases: &["gnn", "graph neural network", "graph neural networks"],
        confidence: 0.95,
    },
    Rule {
        field: "model",
        value: "message_passing_neural_network",
        aliases: &[
            "message passing neural network",
            "message-passing neural network",
        ],
        confidence: 0.95,
    },
    Rule {
        field: "model",
        value: "transformer",
        aliases: &["transformer", "transformers"],
        confidence: 0.95,
    },
    Rule {
        field: "model",
        value: "cnn",
        aliases: &["cnn", "convolutional neural network"],
        confidence: 0.95,
    },
    Rule {
        field: "model",
        value: "lstm",
        aliases: &["lstm", "long short-term memory"],
        confidence: 0.95,
    },
    Rule {
        field: "evaluation_metric",
        value: "accuracy",
        aliases: &["accuracy"],
        confidence: 0.95,
    },
    Rule {
        field: "evaluation_metric",
        value: "f1",
        aliases: &["f1", "f-score", "f score"],
        confidence: 0.95,
    },
    Rule {
        field: "evaluation_metric",
        value: "auroc",
        aliases: &["auroc", "roc auc", "roc-auc"],
        confidence: 0.95,
    },
    Rule {
        field: "evaluation_metric",
        value: "rmse",
        aliases: &["rmse", "root mean squared error"],
        confidence: 0.95,
    },
    Rule {
        field: "evaluation_metric",
        value: "mae",
        aliases: &["mae", "mean absolute error"],
        confidence: 0.95,
    },
    Rule {
        field: "context_goal",
        value: "training",
        aliases: &["training", "train", "trained"],
        confidence: 0.9,
    },
];

pub fn extract_requirements(text: &str) -> ExtractedRequirements {
    let lower = text.to_lowercase();
    let mut suggestions = Vec::new();

    for dataset in DATASET_RULES {
        for alias in sorted_aliases(dataset.aliases) {
            for (start, end) in find_matches(&lower, alias) {
                if is_negated_or_unused(&lower, start, end) {
                    continue;
                }
                let role = Some(infer_dataset_role(&lower, start, end).to_owned());
                add_suggestion(
                    &mut suggestions,
                    text,
                    "named_dataset",
                    dataset.canonical,
                    start,
                    end,
                    dataset_confidence(dataset.canonical, alias),
                    "explicit",
                    role,
                );
            }
        }
    }

    for rule in RULES {
        for alias in sorted_aliases(rule.aliases) {
            for (start, end) in find_matches(&lower, alias) {
                if is_negated_or_unused(&lower, start, end) {
                    continue;
                }
                if rule.field == "modality"
                    && rule.value == "graph"
                    && is_comparative_context(&lower, start, end)
                {
                    continue;
                }
                add_suggestion(
                    &mut suggestions,
                    text,
                    rule.field,
                    rule.value,
                    start,
                    end,
                    confidence_for_alias(rule.confidence, rule.value, alias),
                    "explicit",
                    None,
                );
            }
        }
    }

    if has_value(&suggestions, "subject", "molecular_property_prediction") {
        if let Some((start, end)) = find_first_valid(&lower, "molecular property prediction") {
            add_suggestion(
                &mut suggestions,
                text,
                "subject",
                "chemistry",
                start,
                end,
                0.82,
                "inferred",
                None,
            );
            add_suggestion(
                &mut suggestions,
                text,
                "task",
                "regression",
                start,
                end,
                0.72,
                "inferred",
                None,
            );
        }
    }

    if has_value(&suggestions, "framework", "gnn")
        && has_value(&suggestions, "subject", "chemistry")
        && !has_value(&suggestions, "data_object", "molecular_graph")
    {
        if let Some((start, end)) = find_first_valid(&lower, "gnn")
            .or_else(|| find_first_valid(&lower, "graph neural network"))
        {
            add_suggestion(
                &mut suggestions,
                text,
                "data_object",
                "molecular_graph",
                start,
                end,
                0.62,
                "inferred",
                None,
            );
        }
    }

    if has_value(&suggestions, "modality", "image")
        && has_value(&suggestions, "subject", "cats")
        && has_value(&suggestions, "context_goal", "training")
        && !has_value(&suggestions, "task", "classification")
    {
        if let Some((start, end)) =
            find_first_valid(&lower, "images").or_else(|| find_first_valid(&lower, "image"))
        {
            add_suggestion(
                &mut suggestions,
                text,
                "task",
                "classification",
                start,
                end,
                0.65,
                "inferred",
                None,
            );
        }
    }

    suggestions.sort_by(|left, right| {
        field_order(&left.field)
            .cmp(&field_order(&right.field))
            .then_with(|| left.value.cmp(&right.value))
            .then_with(|| left.span.start.cmp(&right.span.start))
    });

    ExtractedRequirements { suggestions }
}

fn sorted_aliases<'a>(aliases: &'a [&'a str]) -> Vec<&'a str> {
    let mut sorted = aliases.to_vec();
    sorted.sort_by(|left, right| right.len().cmp(&left.len()).then_with(|| left.cmp(right)));
    sorted
}

fn find_matches(lower: &str, alias: &str) -> Vec<(usize, usize)> {
    let alias = alias.to_lowercase();
    lower
        .match_indices(&alias)
        .filter_map(|(start, _)| {
            let end = start + alias.len();
            boundary_ok(lower, start, end, &alias).then_some((start, end))
        })
        .collect()
}

fn find_first_valid(lower: &str, alias: &str) -> Option<(usize, usize)> {
    find_matches(lower, alias)
        .into_iter()
        .find(|(start, end)| !is_negated_or_unused(lower, *start, *end))
}

fn boundary_ok(lower: &str, start: usize, end: usize, alias: &str) -> bool {
    let left = lower[..start].chars().next_back();
    let right = lower[end..].chars().next();
    if left.is_some_and(is_word_char) || right.is_some_and(is_word_char) {
        return false;
    }

    if right == Some('-') && lower[end + 1..].chars().next().is_some_and(is_word_char) {
        return false;
    }
    if left == Some('-')
        && lower[..start - 1]
            .chars()
            .next_back()
            .is_some_and(is_word_char)
        && !alias.ends_with('-')
    {
        return false;
    }
    true
}

fn is_word_char(character: char) -> bool {
    character.is_alphanumeric() || character == '_'
}

fn is_negated_or_unused(lower: &str, start: usize, end: usize) -> bool {
    let (before, after) = local_clause(lower, start, end);
    [
        "not",
        "without",
        "except",
        "rather than",
        "never",
        "excluded",
    ]
    .iter()
    .any(|word| before.trim_end().ends_with(word))
        || ["not an", "not a", "without using", "rather than"]
            .iter()
            .any(|phrase| before.trim_end().ends_with(phrase))
        || [
            "not used",
            "not use",
            "without using",
            "not evaluated",
            "not included",
            "excluded",
        ]
        .iter()
        .any(|phrase| after.contains(phrase))
}

fn is_comparative_context(lower: &str, start: usize, end: usize) -> bool {
    let (before, after) = local_clause(lower, start, end);
    let window = format!("{before} {after}");
    [
        "compare",
        "compared",
        "against",
        "baseline",
        "reference",
        "only",
    ]
    .iter()
    .any(|word| contains_word_or_phrase(&window, word))
}

fn local_clause(lower: &str, start: usize, end: usize) -> (String, String) {
    let left_boundary = lower[..start]
        .char_indices()
        .rev()
        .find(|(_, character)| matches!(character, '.' | ';' | '!' | '?' | '\n'))
        .map_or(0, |(index, character)| index + character.len_utf8());
    let right_boundary = lower[end..]
        .char_indices()
        .find(|(_, character)| matches!(character, '.' | ';' | '!' | '?' | '\n'))
        .map_or(lower.len(), |(index, _)| end + index);
    (
        lower[left_boundary..start].to_owned(),
        lower[end..right_boundary].to_owned(),
    )
}

fn contains_word_or_phrase(text: &str, wanted: &str) -> bool {
    if wanted.contains(' ') {
        return text.contains(wanted);
    }
    text.split(|character: char| !character.is_alphanumeric())
        .any(|word| word == wanted)
}

fn infer_dataset_role(lower: &str, start: usize, end: usize) -> &'static str {
    let (before, after) = local_clause(lower, start, end);
    let window = format!("{before} {after}");
    if ["context only", "for context", "mentioned only"]
        .iter()
        .any(|phrase| window.contains(phrase))
    {
        "context_only"
    } else if ["compare", "compared", "against", "baseline", "reference"]
        .iter()
        .any(|word| contains_word_or_phrase(&window, word))
    {
        "comparison"
    } else {
        "anchor"
    }
}

fn dataset_confidence(canonical: &str, alias: &str) -> f64 {
    if canonical.eq_ignore_ascii_case(alias) {
        0.98
    } else if alias.len() >= 8 {
        0.9
    } else {
        0.84
    }
}

fn confidence_for_alias(base: f64, value: &str, alias: &str) -> f64 {
    if value.eq_ignore_ascii_case(alias) {
        base
    } else {
        (base - 0.1).max(0.55)
    }
}

fn section_for(text: &str, start: usize) -> Option<String> {
    let line_start = text[..start].rfind('\n').map_or(0, |index| index + 1);
    let line = text[line_start..]
        .split_once('\n')
        .map_or(&text[line_start..], |(line, _)| line)
        .trim();
    let lower = line.to_lowercase();
    if lower.contains("abstract") {
        Some("abstract".to_owned())
    } else if lower.contains("introduction") {
        Some("introduction".to_owned())
    } else if lower.contains("method") {
        Some("methods".to_owned())
    } else if lower.contains("dataset") || lower.contains("data") {
        Some("datasets".to_owned())
    } else if lower.contains("reference") || lower.contains("bibliography") {
        Some("references".to_owned())
    } else if lower.contains("figure") || lower.contains("caption") {
        Some("caption".to_owned())
    } else {
        None
    }
}

#[allow(clippy::too_many_arguments)]
fn add_suggestion(
    suggestions: &mut Vec<RequirementSuggestion>,
    text: &str,
    field: &str,
    value: &str,
    start: usize,
    end: usize,
    confidence: f64,
    source: &str,
    role: Option<String>,
) {
    let evidence_text = text
        .get(start..end)
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| value.to_owned());
    let suggestion = RequirementSuggestion {
        field: field.to_owned(),
        value: value.to_owned(),
        evidence_text,
        confidence,
        source: source.to_owned(),
        section: section_for(text, start),
        role,
        span: RequirementSpan { start, end },
        span_start: start,
        span_end: end,
    };

    if let Some(existing) = suggestions
        .iter_mut()
        .find(|item| item.field == field && item.value == value)
    {
        let should_replace = suggestion.confidence > existing.confidence
            || (suggestion.confidence == existing.confidence
                && suggestion.span.start < existing.span.start);
        if should_replace {
            *existing = suggestion;
        }
    } else {
        suggestions.push(suggestion);
    }
}

fn has_value(suggestions: &[RequirementSuggestion], field: &str, value: &str) -> bool {
    suggestions
        .iter()
        .any(|item| item.field == field && item.value == value)
}

fn field_order(field: &str) -> usize {
    match field {
        "named_dataset" => 0,
        "subject" => 1,
        "data_object" => 2,
        "modality" => 3,
        "task" => 4,
        "domain" => 5,
        "target" => 6,
        "context_goal" => 7,
        "framework" => 8,
        "model" => 9,
        "evaluation_metric" => 10,
        "language" => 11,
        "license" => 12,
        _ => 99,
    }
}

#[cfg(test)]
mod tests {
    use super::extract_requirements;

    fn has(result: &super::ExtractedRequirements, field: &str, value: &str) -> bool {
        result
            .suggestions
            .iter()
            .any(|item| item.field == field && item.value == value)
    }

    fn confidence(result: &super::ExtractedRequirements, field: &str, value: &str) -> f64 {
        result
            .suggestions
            .iter()
            .find(|item| item.field == field && item.value == value)
            .map(|item| item.confidence)
            .unwrap_or(0.0)
    }

    #[test]
    fn extracts_contextual_modalities_tasks_and_domains() {
        let result = extract_requirements(
            "We classify retinal images for a medical screening model and evaluate with F1.",
        );

        assert!(has(&result, "modality", "image"));
        assert!(has(&result, "task", "classification"));
        assert!(has(&result, "domain", "medical"));
        assert!(has(&result, "evaluation_metric", "f1"));
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

    #[test]
    fn extracts_chemistry_named_datasets_and_separates_context() {
        let result = extract_requirements(
            &("We evaluate molecular property prediction on ESOL, BACE, and Lipophilicity "
                .to_owned()
                + "with a new GNN framework using MAE and RMSE."),
        );

        assert!(has(&result, "named_dataset", "ESOL"));
        assert!(has(&result, "named_dataset", "BACE"));
        assert!(has(&result, "named_dataset", "Lipophilicity"));
        assert!(has(&result, "framework", "gnn"));
        assert!(has(&result, "evaluation_metric", "mae"));
        assert!(has(&result, "evaluation_metric", "rmse"));
        assert!(has(&result, "subject", "chemistry"));
        assert!(has(&result, "data_object", "molecular_graph"));
    }

    #[test]
    fn uses_boundaries_and_negation_for_generic_terms() {
        let result = extract_requirements(
            "This is not an image dataset. Paragraph text compares graph models only.",
        );

        assert!(!has(&result, "modality", "image"));
        assert!(!has(&result, "modality", "graph"));

        let unrelated = extract_requirements("This is not an image dataset, but BACE is used.");
        assert!(!has(&unrelated, "modality", "image"));
        assert!(has(&unrelated, "named_dataset", "BACE"));
    }

    #[test]
    fn infers_cautious_context_for_cat_image_training_idea() {
        let result =
            extract_requirements("I want to train a machine-learning model on images around cats.");

        assert!(has(&result, "data_object", "cat"));
        assert!(has(&result, "modality", "image"));
        assert!(has(&result, "context_goal", "training"));
        assert!(confidence(&result, "task", "classification") < 0.8);
    }

    #[test]
    fn assigns_comparison_role_and_preserves_explainable_span() {
        let result = extract_requirements(
            "We compare against BACE (beta-secretase) as a baseline; ESOL is used for training.",
        );

        let bace = result
            .suggestions
            .iter()
            .find(|item| item.field == "named_dataset" && item.value == "BACE")
            .expect("BACE should be extracted");
        let esol = result
            .suggestions
            .iter()
            .find(|item| item.field == "named_dataset" && item.value == "ESOL")
            .expect("ESOL should be extracted");

        assert_eq!(bace.role.as_deref(), Some("comparison"));
        assert_eq!(esol.role.as_deref(), Some("anchor"));
        assert_eq!(bace.evidence_text, "BACE");
        assert!(bace.span_end > bace.span_start);
    }

    #[test]
    fn rejects_not_used_named_dataset_mentions_and_deduplicates_aliases() {
        let result = extract_requirements(
            "ESOL, also called Delaney solubility, is used twice. BACE is not used here.",
        );

        assert!(has(&result, "named_dataset", "ESOL"));
        assert!(!has(&result, "named_dataset", "BACE"));
        assert_eq!(
            result
                .suggestions
                .iter()
                .filter(|item| item.field == "named_dataset" && item.value == "ESOL")
                .count(),
            1
        );
    }
}
