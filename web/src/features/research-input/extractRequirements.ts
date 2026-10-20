import { cleanDocumentText } from "../../lib/documents/textCleanup";
import type {
  ExtractedRequirements,
  RequirementExtractor,
  RequirementSuggestion,
} from "./requirementTypes";

export function extractRequirementsFromText(
  text: string,
  extractor: RequirementExtractor,
): ExtractedRequirements {
  const cleanedText = cleanDocumentText(text);
  const result = extractor.extract(cleanedText);
  return {
    suggestions: deduplicateSuggestions(result.suggestions),
  };
}

function deduplicateSuggestions(
  suggestions: RequirementSuggestion[],
): RequirementSuggestion[] {
  const strongest = new Map<string, RequirementSuggestion>();
  suggestions.forEach((suggestion) => {
    const key = `${suggestion.field}:${suggestion.value}`;
    const current = strongest.get(key);
    if (
      !current ||
      suggestion.confidence > current.confidence ||
      (suggestion.confidence === current.confidence &&
        (suggestion.span?.start ?? Number.MAX_SAFE_INTEGER) <
          (current.span?.start ?? Number.MAX_SAFE_INTEGER))
    ) {
      strongest.set(key, suggestion);
    }
  });
  return [...strongest.values()].sort(
    (left, right) =>
      left.field.localeCompare(right.field) ||
      left.value.localeCompare(right.value) ||
      (left.span?.start ?? 0) - (right.span?.start ?? 0),
  );
}
