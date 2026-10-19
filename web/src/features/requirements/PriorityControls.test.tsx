import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PriorityControls } from "./PriorityControls";

describe("PriorityControls", () => {
  it("reports an adjusted ranking priority", () => {
    const onChange = vi.fn();
    render(
      <PriorityControls
        priorities={{
          text_relevance: 0.3,
          task_compatibility: 0.2,
          modality_compatibility: 0.15,
          domain_target_match: 0.15,
          constraint_satisfaction: 0.1,
          evaluation_readiness: 0.05,
          quality_practical_fit: 0.05,
        }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole("slider", { name: /text relevance/i }), {
      target: { value: "0.8" },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ text_relevance: 0.8 }),
    );
  });
});
