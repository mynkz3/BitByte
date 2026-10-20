export type RequirementSource = "explicit" | "inferred" | "catalog_metadata";

export type NamedDatasetRole = "anchor" | "comparison" | "context_only";

export interface RequirementSuggestion {
  field: string;
  value: string;
  evidence_text: string;
  confidence: number;
  source?: RequirementSource;
  section?: string | null;
  role?: NamedDatasetRole;
  named_dataset_role?: NamedDatasetRole;
  span?: { start: number; end: number };
  span_start?: number;
  span_end?: number;
}

export interface ExtractedRequirements {
  suggestions: RequirementSuggestion[];
}

export interface RequirementExtractor {
  extract(text: string): ExtractedRequirements;
}
