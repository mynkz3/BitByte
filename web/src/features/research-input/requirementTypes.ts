export interface RequirementSuggestion {
  field: string;
  value: string;
  evidence_text: string;
  confidence: number;
}

export interface ExtractedRequirements {
  suggestions: RequirementSuggestion[];
}

export interface RequirementExtractor {
  extract(text: string): ExtractedRequirements;
}
