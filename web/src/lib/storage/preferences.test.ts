import { beforeEach, describe, expect, it } from "vitest";
import {
  loadPriorities,
  loadRecentQueries,
  savePriorities,
  saveRecentQuery,
} from "./preferences";

const fallback = {
  text_relevance: 0.3,
  task_compatibility: 0.2,
  modality_compatibility: 0.15,
  domain_target_match: 0.15,
  constraint_satisfaction: 0.1,
  evaluation_readiness: 0.05,
  quality_practical_fit: 0.05,
};

describe("browser preferences", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips ranking priorities", () => {
    savePriorities({ ...fallback, text_relevance: 0.9 });

    expect(loadPriorities(fallback).text_relevance).toBe(0.9);
  });

  it("stores the most recent unique research queries", () => {
    saveRecentQuery("image classification");
    saveRecentQuery("text classification");
    saveRecentQuery("image classification");

    expect(loadRecentQueries()).toEqual(["image classification", "text classification"]);
  });
});
