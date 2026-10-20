import type { ResearchQuery, QueryRequirements } from "../../types/query";
import type { QueryPriorities } from "../../types/query";
import type { EditableRequirement } from "./requirementsState";

const FIELD_TO_REQUIREMENT: Record<string, keyof QueryRequirements | undefined> = {
  modality: "modalities",
  task: "tasks",
  domain: "domains",
  target: "targets",
  language: "languages",
  license: "licenses",
};

export function buildResearchQuery(
  sourceText: string,
  suggestions: EditableRequirement[],
  priorities: QueryPriorities,
): ResearchQuery {
  const requirements: QueryRequirements = {
    modalities: emptyMatchGroup(),
    tasks: emptyMatchGroup(),
    domains: emptyMatchGroup(),
    subjects: emptyMatchGroup(),
    data_objects: emptyMatchGroup(),
    targets: emptyMatchGroup(),
    languages: emptyMatchGroup(),
    licenses: emptyMatchGroup(),
    named_datasets: [],
    required_splits: [],
    min_records: null,
    max_records: null,
    only_verified: false,
  };

  const metrics: string[] = [];
  suggestions.forEach((suggestion) => {
    const field = FIELD_TO_REQUIREMENT[suggestion.field];
    if (!field) {
      if (suggestion.field === "evaluation_metric") metrics.push(suggestion.value);
      return;
    }
    const group = requirements[field];
    if (!isMatchGroup(group)) return;
    const bucket = suggestion.bucket === "must_have" ? "must_have" : "preferred";
    group[bucket].push(suggestion.value);
  });

  const metricContext = metrics.length > 0 ? ` Evaluation metrics: ${metrics.join(", ")}.` : "";
  return {
    source_text: `${sourceText.trim()}${metricContext}`.trim(),
    requirements,
    priorities,
    context: {
      goals: [],
      frameworks: [],
      models: [],
      metrics,
    },
  };
}

function emptyMatchGroup() {
  return { must_have: [], preferred: [], excluded: [] };
}

function isMatchGroup(
  value: QueryRequirements[keyof QueryRequirements],
): value is QueryRequirements["modalities"] {
  return (
    typeof value === "object" &&
    value !== null &&
    "must_have" in value &&
    "preferred" in value &&
    "excluded" in value
  );
}
