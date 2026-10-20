import type {
  NamedDatasetRole,
  RequirementSuggestion,
} from "../research-input/requirementTypes";

export type RequirementBucket = "must_have" | "preferred" | "nice_to_have";

export interface EditableRequirement extends RequirementSuggestion {
  bucket: RequirementBucket;
  named_dataset_role?: NamedDatasetRole;
}

export const FIELD_LABELS: Record<string, string> = {
  modality: "Modality",
  task: "Task",
  domain: "Domain",
  subject: "Research subject",
  data_object: "Data object",
  target: "Target",
  named_dataset: "Paper-mentioned dataset",
  framework: "Framework",
  model: "Model",
  context_goal: "Research goal",
  evaluation_metric: "Evaluation metric",
};

export function toEditableRequirements(
  suggestions: RequirementSuggestion[],
): EditableRequirement[] {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    bucket: "preferred",
    named_dataset_role:
      suggestion.field === "named_dataset" ? suggestion.role ?? "anchor" : undefined,
  }));
}
