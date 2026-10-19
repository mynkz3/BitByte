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
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = `${suggestion.field}:${suggestion.value}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
