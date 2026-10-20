import type {
  NamedDatasetReference,
  QueryContext,
  ResearchQuery,
  QueryRequirements,
} from "../../types/query";
import type { QueryPriorities } from "../../types/query";
import type { EditableRequirement } from "./requirementsState";

const FIELD_TO_REQUIREMENT: Record<string, keyof QueryRequirements | undefined> = {
  modality: "modalities",
  task: "tasks",
  domain: "domains",
  subject: "subjects",
  data_object: "data_objects",
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

  const context: QueryContext = {
    goals: [],
    frameworks: [],
    models: [],
    metrics: [],
  };
  const namedDatasets: NamedDatasetReference[] = [];

  suggestions.forEach((suggestion) => {
    if (suggestion.field === "named_dataset") {
      const reference = {
        name: suggestion.value,
        role: suggestion.named_dataset_role ?? suggestion.role ?? "anchor",
      } satisfies NamedDatasetReference;
      if (!namedDatasets.some((item) => item.name === reference.name)) {
        namedDatasets.push(reference);
      }
      return;
    }

    const contextField =
      suggestion.field === "context_goal"
        ? "goals"
        : suggestion.field === "framework"
          ? "frameworks"
          : suggestion.field === "model"
            ? "models"
            : suggestion.field === "evaluation_metric"
              ? "metrics"
              : undefined;
    if (contextField) {
      const values = context[contextField];
      if (!values.includes(suggestion.value)) values.push(suggestion.value);
      return;
    }

    const field = FIELD_TO_REQUIREMENT[suggestion.field];
    if (!field) return;
    const group = requirements[field];
    if (!isMatchGroup(group)) return;
    const bucket = suggestion.bucket === "must_have" ? "must_have" : "preferred";
    if (!group[bucket].includes(suggestion.value)) group[bucket].push(suggestion.value);
  });

  return {
    source_text: sourceText.trim(),
    requirements: { ...requirements, named_datasets: namedDatasets },
    priorities,
    context,
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
