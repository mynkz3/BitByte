import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RequirementsForm } from "./RequirementsForm";

describe("RequirementsForm", () => {
  it("lets a researcher change a suggestion priority", () => {
    const onBucketChange = vi.fn();
    render(
      <RequirementsForm
        suggestions={[
          {
            field: "modality",
            value: "image",
            evidence_text: "retinal images",
            confidence: 0.8,
            bucket: "preferred",
          },
        ]}
        onBucketChange={onBucketChange}
        onRemove={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/priority for image/i), {
      target: { value: "must_have" },
    });

    expect(onBucketChange).toHaveBeenCalledWith(0, "must_have");
    expect(screen.getByText(/retinal images/i)).toBeInTheDocument();
  });
});
