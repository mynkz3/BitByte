import { describe, expect, it } from "vitest";
import { cleanDocumentText, joinPageText } from "./textCleanup";

describe("document text cleanup", () => {
  it("normalizes whitespace and line endings", () => {
    expect(cleanDocumentText("  First  line\r\n\r\n Second\tline ")).toBe(
      "First line\nSecond line",
    );
  });

  it("keeps page boundaries as paragraph breaks", () => {
    expect(joinPageText(["First page", "Second page"])).toBe(
      "First page\n\nSecond page",
    );
  });
});
