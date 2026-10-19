import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("introduces BitByte as a dataset discovery tool", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /find data that fits your research/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start a research search/i }),
    ).toBeInTheDocument();
  });
});
