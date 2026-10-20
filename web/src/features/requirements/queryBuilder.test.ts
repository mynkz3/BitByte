import { describe, expect, it } from "vitest";
import { buildResearchQuery } from "./queryBuilder";

describe("buildResearchQuery", () => {
  it("turns confirmed suggestions into hard and preferred requirements", () => {
    const query = buildResearchQuery(
      "Find retinal datasets",
      [
        {
          field: "modality",
          value: "image",
          evidence_text: "retinal images",
          confidence: 0.8,
          bucket: "must_have",
        },
        {
          field: "task",
          value: "classification",
          evidence_text: "classification",
          confidence: 0.95,
          bucket: "preferred",
        },
        {
          field: "evaluation_metric",
          value: "f1",
          evidence_text: "F1",
          confidence: 0.95,
          bucket: "nice_to_have",
        },
        {
          field: "named_dataset",
          value: "ESOL",
          evidence_text: "ESOL",
          confidence: 0.95,
          bucket: "preferred",
        },
        {
          field: "framework",
          value: "gnn",
          evidence_text: "GNN",
          confidence: 0.95,
          bucket: "preferred",
        },
        {
          field: "model",
          value: "message passing neural network",
          evidence_text: "message passing neural network",
          confidence: 0.95,
          bucket: "preferred",
        },
      ],
      {
        text_relevance: 0.3,
        task_compatibility: 0.2,
        modality_compatibility: 0.15,
        domain_target_match: 0.15,
        constraint_satisfaction: 0.1,
        evaluation_readiness: 0.05,
        quality_practical_fit: 0.05,
      },
    );

    expect(query.requirements.modalities.must_have).toEqual(["image"]);
    expect(query.requirements.tasks.preferred).toEqual(["classification"]);
    expect(query.source_text).toBe("Find retinal datasets");
    expect(query.requirements.subjects).toEqual({
      must_have: [],
      preferred: [],
      excluded: [],
    });
    expect(query.requirements.data_objects).toEqual({
      must_have: [],
      preferred: [],
      excluded: [],
    });
    expect(query.requirements.named_datasets).toEqual([
      { name: "ESOL", role: "anchor" },
    ]);
    expect(query.context).toEqual({
      goals: [],
      frameworks: ["gnn"],
      models: ["message passing neural network"],
      metrics: ["f1"],
    });
  });
});
