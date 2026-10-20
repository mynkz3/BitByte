use std::collections::{HashMap, HashSet};

use crate::model::{CatalogArtifact, DatasetRecord};
use crate::tokenizer::tokenize;

const TITLE_WEIGHT: f64 = 3.0;
const TAG_WEIGHT: f64 = 2.5;
const STRUCTURED_WEIGHT: f64 = 2.5;
const SUMMARY_WEIGHT: f64 = 1.5;
const SEARCH_TEXT_WEIGHT: f64 = 1.0;
const BM25_K1: f64 = 1.2;
const BM25_B: f64 = 0.75;

#[derive(Debug, Clone)]
struct IndexedDocument {
    term_frequency: HashMap<String, f64>,
    length: f64,
}

#[derive(Debug, Clone)]
pub struct TextIndex {
    documents: Vec<IndexedDocument>,
    inverse_document_frequency: HashMap<String, f64>,
    average_document_length: f64,
}

impl TextIndex {
    pub fn build(artifact: &CatalogArtifact) -> Self {
        let documents = artifact
            .records
            .iter()
            .map(index_record)
            .collect::<Vec<_>>();

        let mut document_frequency: HashMap<String, usize> = HashMap::new();
        for document in &documents {
            for term in document.term_frequency.keys() {
                *document_frequency.entry(term.clone()).or_default() += 1;
            }
        }

        let document_count = documents.len() as f64;
        let inverse_document_frequency = document_frequency
            .into_iter()
            .map(|(term, frequency)| {
                let frequency = frequency as f64;
                let idf = ((document_count - frequency + 0.5) / (frequency + 0.5) + 1.0).ln();
                (term, idf)
            })
            .collect();

        let average_document_length = if documents.is_empty() {
            1.0
        } else {
            documents
                .iter()
                .map(|document| document.length)
                .sum::<f64>()
                / document_count
        };

        Self {
            documents,
            inverse_document_frequency,
            average_document_length,
        }
    }

    pub fn raw_scores(&self, query: &str) -> Vec<f64> {
        let query_terms = tokenize(query)
            .into_iter()
            .collect::<HashSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();

        self.documents
            .iter()
            .map(|document| {
                query_terms
                    .iter()
                    .filter_map(|term| {
                        let term_frequency = *document.term_frequency.get(term)?;
                        let idf = *self.inverse_document_frequency.get(term)?;
                        let denominator = term_frequency
                            + BM25_K1
                                * (1.0 - BM25_B
                                    + BM25_B * document.length / self.average_document_length);
                        Some(idf * term_frequency * (BM25_K1 + 1.0) / denominator)
                    })
                    .sum()
            })
            .collect()
    }
}

fn index_record(record: &DatasetRecord) -> IndexedDocument {
    let mut term_frequency = HashMap::new();
    let mut length = 0.0;

    add_weighted_text(
        &mut term_frequency,
        &mut length,
        &record.content.title,
        TITLE_WEIGHT,
    );
    add_weighted_text(
        &mut term_frequency,
        &mut length,
        &record.content.tags.join(" "),
        TAG_WEIGHT,
    );
    add_weighted_text(
        &mut term_frequency,
        &mut length,
        &record.identity.aliases.join(" "),
        1.5,
    );
    add_weighted_text(
        &mut term_frequency,
        &mut length,
        &structured_text(record),
        STRUCTURED_WEIGHT,
    );
    add_weighted_text(
        &mut term_frequency,
        &mut length,
        &record.content.summary,
        SUMMARY_WEIGHT,
    );
    add_weighted_text(
        &mut term_frequency,
        &mut length,
        &record.content.search_text,
        SEARCH_TEXT_WEIGHT,
    );

    IndexedDocument {
        term_frequency,
        length: length.max(1.0),
    }
}

fn structured_text(record: &DatasetRecord) -> String {
    [
        record.fit.modalities.join(" "),
        record.fit.tasks.join(" "),
        record.fit.domains.join(" "),
        record.fit.subjects.join(" "),
        record.fit.data_objects.join(" "),
        record.fit.targets.join(" "),
        record.fit.languages.join(" "),
        record.fit.geography.join(" "),
        record.fit.annotation_types.join(" "),
    ]
    .join(" ")
}

fn add_weighted_text(
    term_frequency: &mut HashMap<String, f64>,
    length: &mut f64,
    text: &str,
    weight: f64,
) {
    let unique_terms: HashSet<String> = tokenize(text).into_iter().collect();
    for term in unique_terms {
        *term_frequency.entry(term).or_default() += weight;
        *length += weight;
    }
}
