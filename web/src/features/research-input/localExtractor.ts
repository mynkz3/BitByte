import type {
  ExtractedRequirements,
  RequirementExtractor,
  RequirementSuggestion,
} from "./requirementTypes";

const RULES: Array<[string, string, string[]]> = [
  ["modality", "image", ["image", "images", "visual", "retinal"]],
  ["modality", "text", ["text", "nlp", "language", "document"]],
  ["modality", "audio", ["audio", "speech", "voice"]],
  ["modality", "video", ["video", "videos"]],
  ["modality", "time_series", ["time series", "temporal"]],
  ["modality", "graph", ["graph", "network"]],
  ["task", "classification", ["classification", "classify", "categorization"]],
  ["task", "regression", ["regression", "continuous prediction"]],
  ["task", "detection", ["object detection", "detection"]],
  ["task", "segmentation", ["segmentation", "pixel labeling"]],
  ["task", "forecasting", ["forecasting", "future prediction"]],
  ["task", "clustering", ["clustering", "grouping"]],
  ["domain", "medical", ["medical", "clinical", "healthcare", "disease"]],
  ["domain", "climate", ["climate", "weather", "environment"]],
  ["domain", "finance", ["finance", "financial", "banking"]],
  ["domain", "agriculture", ["agriculture", "farming", "crops"]],
  ["domain", "education", ["education", "student"]],
  ["evaluation_metric", "accuracy", ["accuracy"]],
  ["evaluation_metric", "f1", ["f1", "f-score"]],
  ["evaluation_metric", "auroc", ["auroc", "roc auc"]],
  ["evaluation_metric", "rmse", ["rmse", "root mean squared error"]],
  ["evaluation_metric", "mae", ["mae", "mean absolute error"]],
];

export const localKeywordExtractor: RequirementExtractor = {
  extract(text: string): ExtractedRequirements {
    const lower = text.toLowerCase();
    const suggestions: RequirementSuggestion[] = [];

    RULES.forEach(([field, value, aliases]) => {
      const alias = aliases.find((candidate) => lower.includes(candidate));
      if (!alias) return;
      suggestions.push({
        field,
        value,
        evidence_text: alias,
        confidence: alias === value ? 0.95 : 0.8,
      });
    });

    return { suggestions };
  },
};
