import { describe, expect, it } from "vitest";
import { extractRequirementsFromText } from "./extractRequirements";
import type { RequirementExtractor } from "./requirementTypes";

describe("extractRequirementsFromText", () => {
  it("cleans input before asking the local extractor and removes duplicates", () => {
    const received: string[] = [];
    const extractor: RequirementExtractor = {
      extract(text) {
        received.push(text);
        return {
          suggestions: [
            {
              field: "modality",
              value: "image",
              evidence_text: "image",
              confidence: 0.95,
            },
            {
              field: "modality",
              value: "image",
              evidence_text: "images",
              confidence: 0.8,
            },
          ],
        };
      },
    };

    const result = extractRequirementsFromText("  image\r\n\r\n research  ", extractor);

    expect(received).toEqual(["image\nresearch"]);
    expect(result.suggestions).toHaveLength(1);
  });
});
