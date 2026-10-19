import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultsList } from "./ResultsList";

describe("ResultsList", () => {
  it("explains the empty search state", () => {
    render(<ResultsList results={[]} />);

    expect(
      screen.getByText(/confirm your requirements and start a search/i),
    ).toBeInTheDocument();
  });
});
