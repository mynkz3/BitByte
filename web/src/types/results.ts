import type { DatasetRecord } from "./catalog";

export interface ScoreBreakdown {
  named_dataset_match: number;
  text_relevance: number;
  task_compatibility: number;
  modality_compatibility: number;
  subject_compatibility: number;
  data_object_compatibility: number;
  domain_target_match: number;
  constraint_satisfaction: number;
  evaluation_readiness: number;
  quality_practical_fit: number;
  total: number;
}

export interface ExplanationItem {
  category: string;
  tone: "positive" | "warning" | "neutral";
  text: string;
  contribution: number;
}

export interface RankedResult {
  dataset: DatasetRecord;
  score: number;
  score_breakdown: ScoreBreakdown;
  matched_requirements: string[];
  unverified_requirements: string[];
  explanation_items: ExplanationItem[];
  match_tier?: number;
  named_dataset_matches?: string[];
}
