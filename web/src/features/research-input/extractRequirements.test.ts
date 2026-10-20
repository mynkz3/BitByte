import { describe, expect, it } from "vitest";
import { extractRequirementsFromText } from "./extractRequirements";
import type { RequirementExtractor } from "./requirementTypes";
import { localKeywordExtractor } from "./localExtractor";

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

  it("extracts chemistry identities and isolates experiment context", () => {
    const result = extractRequirementsFromText(
      "We evaluate molecular property prediction on ESOL, BACE, and Lipophilicity with a GNN framework using MAE and RMSE.",
      localKeywordExtractor,
    );

    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "named_dataset", value: "ESOL" }),
        expect.objectContaining({ field: "named_dataset", value: "BACE" }),
        expect.objectContaining({ field: "named_dataset", value: "Lipophilicity" }),
        expect.objectContaining({ field: "subject", value: "chemistry" }),
        expect.objectContaining({ field: "framework", value: "gnn" }),
        expect.objectContaining({ field: "evaluation_metric", value: "mae" }),
      ]),
    );
  });

  it("does not infer negated image or comparative graph requirements", () => {
    const result = extractRequirementsFromText(
      "This is not an image dataset. We compare graph models only.",
      localKeywordExtractor,
    );

    expect(result.suggestions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "modality", value: "image" }),
        expect.objectContaining({ field: "modality", value: "graph" }),
      ]),
    );

    const unrelated = extractRequirementsFromText(
      "This is not an image dataset, but BACE is used.",
      localKeywordExtractor,
    );
    expect(unrelated.suggestions).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "named_dataset", value: "BACE" })]),
    );
  });

  it("keeps cautious cat-image context editable", () => {
    const result = extractRequirementsFromText(
      "I want to train a machine-learning model on images around cats.",
      localKeywordExtractor,
    );

    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "context_goal", value: "training" }),
        expect.objectContaining({ field: "data_object", value: "cat" }),
        expect.objectContaining({ field: "modality", value: "image" }),
        expect.objectContaining({ field: "task", value: "classification", confidence: 0.65 }),
      ]),
    );
  });
});
