import type {
  ExtractedRequirements,
  NamedDatasetRole,
  RequirementExtractor,
  RequirementSuggestion,
  RequirementSource,
} from "./requirementTypes";

interface Rule {
  field: string;
  value: string;
  aliases: string[];
  confidence: number;
}

interface DatasetRule {
  canonical: string;
  aliases: string[];
}

const DATASET_RULES: DatasetRule[] = [
  { canonical: "ESOL", aliases: ["ESOL", "Delaney solubility", "Delaney"] },
  { canonical: "BACE", aliases: ["BACE", "BACE classification"] },
  {
    canonical: "Lipophilicity",
    aliases: ["Lipophilicity", "Delaney lipophilicity"],
  },
  { canonical: "BBBP", aliases: ["BBBP", "blood-brain barrier penetration"] },
  { canonical: "Tox21", aliases: ["Tox21", "Tox-21"] },
  { canonical: "ClinTox", aliases: ["ClinTox", "Clin-Tox", "clinical toxicity"] },
  { canonical: "HIV", aliases: ["HIV", "HIV inhibition"] },
  { canonical: "SIDER", aliases: ["SIDER", "side effect resource"] },
  { canonical: "QM7", aliases: ["QM7", "QM-7"] },
  { canonical: "QM8", aliases: ["QM8", "QM-8"] },
  { canonical: "QM9", aliases: ["QM9", "QM-9"] },
  {
    canonical: "Breast Cancer Wisconsin (Diagnostic)",
    aliases: [
      "Breast Cancer Wisconsin (Diagnostic)",
      "Breast Cancer Wisconsin",
      "WDBC",
      "Wisconsin Diagnostic Breast Cancer",
    ],
  },
  { canonical: "Iris", aliases: ["Iris", "Iris flower", "Iris species", "Fisher Iris"] },
];

const RULES: Rule[] = ([
  ["modality", "image", ["images", "image", "visual", "retinal", "photographs"], 0.95],
  ["modality", "text", ["text", "nlp", "language", "documents", "document"], 0.95],
  ["modality", "audio", ["audio", "speech", "voice"], 0.95],
  ["modality", "video", ["videos", "video"], 0.95],
  ["modality", "time_series", ["time series", "temporal", "forecasting data"], 0.95],
  ["modality", "graph", ["nodes and edges", "graph", "network"], 0.9],
  ["modality", "tabular", ["tabular", "table", "tables", "csv", "spreadsheet"], 0.95],
  ["task", "classification", ["classification", "classify", "categorization", "categorisation"], 0.95],
  ["task", "regression", ["regression", "continuous prediction", "numeric prediction"], 0.95],
  ["task", "detection", ["object detection", "detection", "localization", "localisation"], 0.95],
  ["task", "segmentation", ["segmentation", "pixel labeling", "pixel labelling"], 0.95],
  ["task", "forecasting", ["forecasting", "future prediction"], 0.95],
  ["task", "clustering", ["clustering", "grouping"], 0.95],
  ["domain", "medical", ["medical", "clinical", "healthcare", "disease"], 0.9],
  ["domain", "climate", ["climate", "weather", "environment"], 0.9],
  ["domain", "finance", ["finance", "financial", "banking"], 0.9],
  ["domain", "agriculture", ["agriculture", "farming", "crops"], 0.9],
  ["domain", "education", ["education", "student", "learning outcomes"], 0.9],
  ["subject", "chemistry", ["chemistry", "chemical science", "chemical sciences", "molecular science"], 0.88],
  ["subject", "molecular_property_prediction", ["molecular property prediction", "molecule property prediction"], 0.95],
  ["subject", "animals", ["animals", "animal"], 0.82],
  ["subject", "cats", ["cats", "cat", "felines", "feline"], 0.95],
  ["subject", "medical", ["medical", "medicine", "clinical", "healthcare"], 0.92],
  ["subject", "plants", ["plants", "plant", "botany", "flowers", "flower"], 0.88],
  ["data_object", "molecule", ["molecules", "molecule", "chemical compound", "compounds", "compound"], 0.92],
  ["data_object", "molecular_graph", ["molecular graphs", "molecular graph"], 0.95],
  ["data_object", "image", ["images", "image"], 0.84],
  ["data_object", "cat", ["cats", "cat"], 0.9],
  ["data_object", "patient_record", ["patient records", "patient record", "clinical record"], 0.92],
  ["data_object", "plant_measurement", ["plant measurements", "flower measurements"], 0.92],
  ["target", "molecular_property", ["molecular property", "molecule property"], 0.76],
  ["target", "diagnosis", ["diagnosis", "diagnostic outcome"], 0.92],
  ["target", "species", ["species", "flower species"], 0.92],
  ["framework", "gnn", ["gnn", "graph neural network", "graph neural networks"], 0.95],
  ["model", "message_passing_neural_network", ["message passing neural network", "message-passing neural network"], 0.95],
  ["model", "transformer", ["transformer", "transformers"], 0.95],
  ["model", "cnn", ["cnn", "convolutional neural network"], 0.95],
  ["model", "lstm", ["lstm", "long short-term memory"], 0.95],
  ["evaluation_metric", "accuracy", ["accuracy"], 0.95],
  ["evaluation_metric", "f1", ["f1", "f-score", "f score"], 0.95],
  ["evaluation_metric", "auroc", ["auroc", "roc auc", "roc-auc"], 0.95],
  ["evaluation_metric", "rmse", ["rmse", "root mean squared error"], 0.95],
  ["evaluation_metric", "mae", ["mae", "mean absolute error"], 0.95],
  ["context_goal", "training", ["training", "train", "trained"], 0.9],
] as [string, string, string[], number][]).map(([field, value, aliases, confidence]) => ({
  field,
  value,
  aliases,
  confidence,
}));

const FIELD_ORDER: Record<string, number> = {
  named_dataset: 0,
  subject: 1,
  data_object: 2,
  modality: 3,
  task: 4,
  domain: 5,
  target: 6,
  context_goal: 7,
  framework: 8,
  model: 9,
  evaluation_metric: 10,
};

export const localKeywordExtractor: RequirementExtractor = {
  extract(text: string): ExtractedRequirements {
    const lower = text.toLowerCase();
    const suggestions: RequirementSuggestion[] = [];

    for (const dataset of DATASET_RULES) {
      for (const alias of sortAliases(dataset.aliases)) {
        for (const match of findMatches(lower, alias)) {
          if (isNegatedOrUnused(lower, match.start, match.end)) continue;
          addSuggestion(
            suggestions,
            text,
            "named_dataset",
            dataset.canonical,
            match,
            datasetConfidence(dataset.canonical, alias),
            "explicit",
            inferDatasetRole(lower, match.start, match.end),
          );
        }
      }
    }

    for (const rule of RULES) {
      for (const alias of sortAliases(rule.aliases)) {
        for (const match of findMatches(lower, alias)) {
          if (isNegatedOrUnused(lower, match.start, match.end)) continue;
          if (
            rule.field === "modality" &&
            rule.value === "graph" &&
            isComparativeContext(lower, match.start, match.end)
          ) {
            continue;
          }
          addSuggestion(
            suggestions,
            text,
            rule.field,
            rule.value,
            match,
            confidenceForAlias(rule.confidence, rule.value, alias),
            "explicit",
          );
        }
      }
    }

    if (hasValue(suggestions, "subject", "molecular_property_prediction")) {
      const match = findFirstValid(lower, "molecular property prediction");
      if (match) {
        addSuggestion(suggestions, text, "subject", "chemistry", match, 0.82, "inferred");
        addSuggestion(suggestions, text, "task", "regression", match, 0.72, "inferred");
      }
    }

    if (
      hasValue(suggestions, "framework", "gnn") &&
      hasValue(suggestions, "subject", "chemistry") &&
      !hasValue(suggestions, "data_object", "molecular_graph")
    ) {
      const match = findFirstValid(lower, "gnn") ?? findFirstValid(lower, "graph neural network");
      if (match) {
        addSuggestion(suggestions, text, "data_object", "molecular_graph", match, 0.62, "inferred");
      }
    }

    if (
      hasValue(suggestions, "modality", "image") &&
      hasValue(suggestions, "subject", "cats") &&
      hasValue(suggestions, "context_goal", "training") &&
      !hasValue(suggestions, "task", "classification")
    ) {
      const match = findFirstValid(lower, "images") ?? findFirstValid(lower, "image");
      if (match) {
        addSuggestion(suggestions, text, "task", "classification", match, 0.65, "inferred");
      }
    }

    suggestions.sort((left, right) =>
      (FIELD_ORDER[left.field] ?? 99) - (FIELD_ORDER[right.field] ?? 99) ||
      left.value.localeCompare(right.value) ||
      (left.span?.start ?? 0) - (right.span?.start ?? 0),
    );
    return { suggestions };
  },
};

function sortAliases(aliases: string[]): string[] {
  return [...aliases].sort((left, right) => right.length - left.length || left.localeCompare(right));
}

function findMatches(text: string, alias: string): Array<{ start: number; end: number }> {
  const lowerAlias = alias.toLowerCase();
  const matches: Array<{ start: number; end: number }> = [];
  let offset = 0;
  while (offset < text.length) {
    const start = text.indexOf(lowerAlias, offset);
    if (start < 0) break;
    const end = start + lowerAlias.length;
    if (boundaryOk(text, start, end, lowerAlias)) matches.push({ start, end });
    offset = Math.max(end, start + 1);
  }
  return matches;
}

function boundaryOk(text: string, start: number, end: number, alias: string): boolean {
  const left = text[start - 1];
  const right = text[end];
  if (isWordChar(left) || isWordChar(right)) return false;
  if (right === "-" && isWordChar(text[end + 1])) return false;
  if (left === "-" && isWordChar(text[start - 2]) && !alias.endsWith("-")) return false;
  return true;
}

function isWordChar(value: string | undefined): boolean {
  return value !== undefined && /[a-z0-9_]/i.test(value);
}

function localClause(text: string, start: number, end: number): [string, string] {
  const leftMatches = [...text.slice(0, start).matchAll(/[.;!?\n]/g)];
  const leftBoundary = leftMatches.length
    ? (leftMatches[leftMatches.length - 1].index ?? 0) + 1
    : 0;
  const rightMatch = text.slice(end).search(/[.;!?\n]/);
  const rightBoundary = rightMatch < 0 ? text.length : end + rightMatch;
  return [text.slice(leftBoundary, start), text.slice(end, rightBoundary)];
}

function isNegatedOrUnused(text: string, start: number, end: number): boolean {
  const [before, after] = localClause(text, start, end);
  return (
    ["not", "without", "except", "rather than", "never", "excluded"].some((word) =>
      before.trimEnd().endsWith(word),
    ) ||
    ["not an", "not a", "without using", "rather than"].some((phrase) =>
      before.trimEnd().endsWith(phrase),
    ) ||
    ["not used", "not use", "without using", "not evaluated", "not included", "excluded"].some(
      (phrase) => after.includes(phrase),
    )
  );
}

function isComparativeContext(text: string, start: number, end: number): boolean {
  const [before, after] = localClause(text, start, end);
  const clause = `${before} ${after}`;
  return ["compare", "compared", "against", "baseline", "reference", "only"].some((word) =>
    containsWord(clause, word),
  );
}

function containsWord(text: string, wanted: string): boolean {
  return text.split(/[^a-z0-9]+/i).some((word) => word === wanted);
}

function inferDatasetRole(text: string, start: number, end: number): NamedDatasetRole {
  const [before, after] = localClause(text, start, end);
  const clause = `${before} ${after}`;
  if (["context only", "for context", "mentioned only"].some((phrase) => clause.includes(phrase))) {
    return "context_only";
  }
  if (["compare", "compared", "against", "baseline", "reference"].some((word) => containsWord(clause, word))) {
    return "comparison";
  }
  return "anchor";
}

function findFirstValid(text: string, alias: string): { start: number; end: number } | undefined {
  return findMatches(text, alias).find((match) => !isNegatedOrUnused(text, match.start, match.end));
}

function hasValue(suggestions: RequirementSuggestion[], field: string, value: string): boolean {
  return suggestions.some((suggestion) => suggestion.field === field && suggestion.value === value);
}

function datasetConfidence(canonical: string, alias: string): number {
  if (canonical.toLowerCase() === alias.toLowerCase()) return 0.98;
  return alias.length >= 8 ? 0.9 : 0.84;
}

function confidenceForAlias(base: number, value: string, alias: string): number {
  return value.toLowerCase() === alias.toLowerCase() ? base : Math.max(base - 0.1, 0.55);
}

function addSuggestion(
  suggestions: RequirementSuggestion[],
  text: string,
  field: string,
  value: string,
  match: { start: number; end: number },
  confidence: number,
  source: RequirementSource,
  role?: NamedDatasetRole,
): void {
  const suggestion: RequirementSuggestion = {
    field,
    value,
    evidence_text: text.slice(match.start, match.end),
    confidence,
    source,
    section: sectionFor(text, match.start),
    role,
    span: match,
    span_start: match.start,
    span_end: match.end,
  };
  const existing = suggestions.find((item) => item.field === field && item.value === value);
  if (!existing) {
    suggestions.push(suggestion);
  } else if (
    suggestion.confidence > existing.confidence ||
    (suggestion.confidence === existing.confidence &&
      (suggestion.span?.start ?? 0) < (existing.span?.start ?? 0))
  ) {
    Object.assign(existing, suggestion);
  }
}

function sectionFor(text: string, start: number): string | undefined {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const line = text.slice(lineStart, text.indexOf("\n", start) < 0 ? text.length : text.indexOf("\n", start));
  const lower = line.toLowerCase();
  if (lower.includes("abstract")) return "abstract";
  if (lower.includes("introduction")) return "introduction";
  if (lower.includes("method")) return "methods";
  if (lower.includes("dataset") || lower.includes("data")) return "datasets";
  if (lower.includes("reference") || lower.includes("bibliography")) return "references";
  if (lower.includes("figure") || lower.includes("caption")) return "caption";
  return undefined;
}
