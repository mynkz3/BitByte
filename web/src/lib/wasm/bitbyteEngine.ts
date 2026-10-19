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
      for (let offset = 0; offset + 10 <= flat.length; offset += 10) {
        hits.push(Array.from(flat.slice(offset, offset + 10)) as NumericRankedResult);
      }
      return hits.flatMap((hit) => {
        const [
          index,
          score,
          text_relevance,
          task_compatibility,
          modality_compatibility,
          domain_target_match,
          constraint_satisfaction,
          evaluation_readiness,
          quality_practical_fit,
          total,
        ] = hit;
        const dataset = records[index];
        if (!dataset) return [];
        const score_breakdown = {
          text_relevance,
          task_compatibility,
          modality_compatibility,
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
            matched_requirements: matchedRequirements(score_breakdown),
            unverified_requirements: [],
            explanation_items: explanationItems(score_breakdown),
          },
        ];
      });
    },
    extractRequirements(text) {
      return JSON.parse(bindings.extractRequirements(text)) as ExtractedRequirements;
    },
  };
}

function matchedRequirements(breakdown: ScoreBreakdown): string[] {
  return [
    breakdown.modality_compatibility > 0 ? "modality" : null,
    breakdown.task_compatibility > 0 ? "task" : null,
    breakdown.domain_target_match > 0 ? "domain" : null,
  ].filter((value): value is string => value !== null);
}

function explanationItems(breakdown: ScoreBreakdown): ExplanationItem[] {
  return [
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
