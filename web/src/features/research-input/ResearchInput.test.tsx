import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResearchInput } from "./ResearchInput";

describe("ResearchInput", () => {
  it("submits a typed research description", () => {
    const onSubmit = vi.fn();
    render(
      <ResearchInput
        value="classify medical images"
        onValueChange={vi.fn()}
        onSubmit={onSubmit}
        onFileSelected={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /analyze my research/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
