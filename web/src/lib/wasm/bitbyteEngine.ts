import init, { SearchEngine } from "../../wasm-pkg/bitbyte_engine";
import type { CatalogArtifact } from "../../features/catalog/catalogManifest";
import type { ResearchQuery } from "../../types/query";
import type { ExplanationItem, RankedResult, ScoreBreakdown } from "../../types/results";
import type { DatasetRecord } from "../../types/catalog";
import type { ExtractedRequirements } from "../../features/research-input/requirementTypes";

export interface WasmSearchEngine {
  search: (query: ResearchQuery, limit: number) => RankedResult[];
  extractRequirements: (text: string) => ExtractedRequirements;
}

type NumericRankedResult = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface WasmBindings {
  initialize: () => Promise<unknown>;
  searchCatalog: (catalogJson: string, queryJson: string, limit: number) => Float64Array;
  extractRequirements: (text: string) => string;
}

const browserBindings: WasmBindings = {
  initialize: init,
  searchCatalog: (catalogJson, queryJson, limit) =>
    SearchEngine.searchCatalog(catalogJson, queryJson, limit),
  extractRequirements: (text) => SearchEngine.extractRequirements(text),
};

export async function loadWasmEngine(
  catalog: CatalogArtifact,
  bindings: WasmBindings = browserBindings,
): Promise<WasmSearchEngine> {
  await bindings.initialize();
  const catalogJson = JSON.stringify(catalog);
  const records = catalog.records as DatasetRecord[];

  return {
    search(query, limit) {
      const flat = bindings.searchCatalog(catalogJson, JSON.stringify(query), limit);
      const hits: NumericRankedResult[] = [];
      for (let offset = 0; offset + 13 <= flat.length; offset += 13) {
        hits.push(Array.from(flat.slice(offset, offset + 13)) as NumericRankedResult);
      }
      return hits.flatMap((hit) => {
          const [
            index,
            score,
            named_dataset_match,
            text_relevance,
            task_compatibility,
            modality_compatibility,
            subject_compatibility,
            data_object_compatibility,
            domain_target_match,
          constraint_satisfaction,
          evaluation_readiness,
          quality_practical_fit,
          total,
        ] = hit;
        const dataset = records[index];
        if (!dataset) return [];
          const score_breakdown = {
          named_dataset_match,
          text_relevance,
          task_compatibility,
          modality_compatibility,
          subject_compatibility,
          data_object_compatibility,
          domain_target_match,
          constraint_satisfaction,
          evaluation_readiness,
          quality_practical_fit,
          total,
        } satisfies ScoreBreakdown;
        return [
          {
            dataset,
            score,
            score_breakdown,
            matched_requirements: matchedRequirements(score_breakdown, query, dataset),
            unverified_requirements: unverifiedRequirements(query, dataset),
            explanation_items: explanationItems(score_breakdown, query, dataset),
            match_tier: matchTier(score_breakdown, query, dataset),
            named_dataset_matches: namedDatasetMatches(query, dataset),
          },
        ];
      });
    },
    extractRequirements(text) {
      return JSON.parse(bindings.extractRequirements(text)) as ExtractedRequirements;
    },
  };
}

function matchedRequirements(
  breakdown: ScoreBreakdown,
  query: ResearchQuery,
  dataset: DatasetRecord,
): string[] {
  return [
    namedDatasetMatches(query, dataset).length > 0 ? "named_dataset" : null,
    breakdown.modality_compatibility > 0 ? "modality" : null,
    breakdown.task_compatibility > 0 ? "task" : null,
    breakdown.domain_target_match > 0 ? "domain" : null,
    breakdown.subject_compatibility > 0 ? "subject" : null,
    breakdown.data_object_compatibility > 0 ? "data_object" : null,
  ].filter((value): value is string => value !== null);
}

function explanationItems(
  breakdown: ScoreBreakdown,
  query: ResearchQuery,
  dataset: DatasetRecord,
): ExplanationItem[] {
  const names = namedDatasetMatches(query, dataset);
  const items: ExplanationItem[] = [
    ...(names.length > 0
      ? [{
          category: "named_dataset",
          tone: "positive" as const,
          text: `Exact alias match for ${names.join(", ")}`,
          contribution: breakdown.named_dataset_match,
        }]
      : []),
    matchExplanation(
      "subject",
      breakdown.subject_compatibility,
      "research subject matches the dataset",
      "research subject is not reported as a match",
    ),
    matchExplanation(
      "data_object",
      breakdown.data_object_compatibility,
      "data object matches the research context",
      "data object fit is not reported as a match",
    ),
    matchExplanation(
      "modality",
      breakdown.modality_compatibility,
      "modality matches the research requirements",
      "modality is not reported as a match",
    ),
    matchExplanation(
      "task",
      breakdown.task_compatibility,
      "task matches the research requirements",
      "task fit is not reported as a match",
    ),
    matchExplanation(
      "domain",
      breakdown.domain_target_match,
      "domain or target matches the research requirements",
      "domain or target fit is not fully verified",
    ),
  ];
  if (query.context.frameworks.length > 0 || query.context.models.length > 0) {
    items.push({
      category: "experiment_context",
      tone: "neutral",
      text: `Framework/model context noted: ${[...query.context.frameworks, ...query.context.models].join(", ")}`,
      contribution: 0,
    });
  }
  if (query.context.metrics.length > 0) {
    items.push({
      category: "evaluation_context",
      tone: "neutral",
      text: `Evaluation metrics noted but not used as dataset identity: ${query.context.metrics.join(", ")}`,
      contribution: 0,
    });
  }
  return items;
}

function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function namedDatasetMatches(query: ResearchQuery, dataset: DatasetRecord): string[] {
  const identity = [
    ...dataset.identity.aliases,
    dataset.identity.source_id,
    dataset.content.title,
    dataset.content.citation,
  ].map(normalizeIdentity);
  return query.requirements.named_datasets
    .filter((reference) => reference.role !== "context_only")
    .filter((reference) => identity.includes(normalizeIdentity(reference.name)))
    .map((reference) => reference.name);
}

function unverifiedRequirements(query: ResearchQuery, dataset: DatasetRecord): string[] {
  const matches = namedDatasetMatches(query, dataset);
  return query.requirements.named_datasets
    .filter((reference) => reference.role !== "context_only" && !matches.includes(reference.name))
    .map((reference) => `named_dataset:${reference.name}`);
}

function matchTier(
  breakdown: ScoreBreakdown,
  query: ResearchQuery,
  dataset: DatasetRecord,
): number {
  const names = namedDatasetMatches(query, dataset);
  if (names.length > 0) {
    return query.requirements.named_datasets.some(
      (reference) => names.includes(reference.name) && reference.role === "anchor",
    )
      ? 3
      : 2;
  }
  return breakdown.subject_compatibility > 0 ||
    breakdown.data_object_compatibility > 0 ||
    breakdown.task_compatibility > 0 ||
    breakdown.domain_target_match > 0
    ? 1
    : 0;
}

function matchExplanation(
  category: string,
  contribution: number,
  positiveText: string,
  warningText: string,
): ExplanationItem {
  return {
    category,
    tone: contribution > 0 ? "positive" : "warning",
    text: contribution > 0 ? positiveText : warningText,
    contribution,
  };
}
