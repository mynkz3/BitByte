import dataset from "../../../../catalog_builder/tests/fixtures/valid_dataset.json";
import { describe, expect, it } from "vitest";
import { loadWasmEngine, type WasmBindings } from "./bitbyteEngine";

describe("BitByte WASM engine", () => {
  it("extracts requirements and ranks a matching catalog record", async () => {
    const bindings: WasmBindings = {
      initialize: async () => undefined,
      searchCatalog: () =>
        new Float64Array([0, 92, 0, 0.9, 1, 1, 0, 0, 1, 1, 1, 1, 0.92]),
      extractRequirements: () =>
        JSON.stringify({
          suggestions: [
            { field: "task", value: "classification" },
            { field: "modality", value: "image" },
            { field: "domain", value: "medical" },
          ],
        }),
    };
    const engine = await loadWasmEngine(
      {
        catalog_version: "test",
        schema_version: "0.2.0",
        records: [dataset],
      },
      bindings,
    );

    const requirements = engine.extractRequirements(
      "Classify retinal images for a medical screening model using F1.",
    );
    const results = engine.search(
      {
        source_text: "Classify retinal images for a medical screening model",
        requirements: {
          modalities: { must_have: ["image"], preferred: [], excluded: [] },
          tasks: { must_have: ["classification"], preferred: [], excluded: [] },
          domains: { must_have: ["medical"], preferred: [], excluded: [] },
          subjects: { must_have: [], preferred: [], excluded: [] },
          data_objects: { must_have: [], preferred: [], excluded: [] },
          targets: { must_have: [], preferred: ["retinopathy"], excluded: [] },
          languages: { must_have: [], preferred: [], excluded: [] },
          licenses: { must_have: ["permissive"], preferred: [], excluded: [] },
          named_datasets: [],
          required_splits: ["train", "test"],
          min_records: 500,
          max_records: null,
          only_verified: false,
        },
        priorities: {
          text_relevance: 0.3,
          task_compatibility: 0.2,
          modality_compatibility: 0.15,
          domain_target_match: 0.15,
          constraint_satisfaction: 0.1,
          evaluation_readiness: 0.05,
          quality_practical_fit: 0.05,
        },
        context: {
          goals: [],
          frameworks: [],
          models: [],
          metrics: ["f1"],
        },
      },
      10,
    );

    expect(requirements.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "task", value: "classification" }),
        expect.objectContaining({ field: "modality", value: "image" }),
        expect.objectContaining({ field: "domain", value: "medical" }),
      ]),
    );
    expect(results).toHaveLength(1);
    expect(results[0].dataset.identity.id).toBe("huggingface:bitbyte/demo-image");
  });
});
