import type { RequirementSuggestion } from "../research-input/requirementTypes";

export type RequirementBucket = "must_have" | "preferred" | "nice_to_have";

export interface EditableRequirement extends RequirementSuggestion {
  bucket: RequirementBucket;
}

export const FIELD_LABELS: Record<string, string> = {
  modality: "Modality",
  task: "Task",
  domain: "Domain",
  target: "Target",
  evaluation_metric: "Evaluation metric",
};

export function toEditableRequirements(
  suggestions: RequirementSuggestion[],
): EditableRequirement[] {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    bucket: "preferred",
  }));
}
