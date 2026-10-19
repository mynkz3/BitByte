import {
  FIELD_LABELS,
  type EditableRequirement,
  type RequirementBucket,
} from "./requirementsState";

interface RequirementsFormProps {
  suggestions: EditableRequirement[];
  onBucketChange: (index: number, bucket: RequirementBucket) => void;
  onRemove: (index: number) => void;
  onConfirm: () => void;
}

export function RequirementsForm({
  suggestions,
  onBucketChange,
  onRemove,
  onConfirm,
}: RequirementsFormProps) {
  return (
    <section className="workflow-card" aria-labelledby="requirements-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Step 2</p>
          <h2 id="requirements-title">Confirm the requirements</h2>
        </div>
        <span className="step-count">{suggestions.length} suggestions</span>
      </div>
      <p className="section-copy">
        BitByte found these signals. Decide what is essential and what is only
        a preference before searching.
      </p>
      {suggestions.length === 0 ? (
        <p className="empty-state">
          No requirements were detected yet. Add more context to your research
          description.
        </p>
      ) : (
        <div className="requirement-list">
          {suggestions.map((suggestion, index) => (
            <article className="requirement-row" key={`${suggestion.field}-${suggestion.value}`}>
              <div>
                <span className="requirement-field">
                  {FIELD_LABELS[suggestion.field] ?? suggestion.field}
                </span>
                <strong>{suggestion.value.replaceAll("_", " ")}</strong>
                <p className="evidence-text">“{suggestion.evidence_text}”</p>
              </div>
              <div className="requirement-controls">
                <label>
                  <span className="sr-only">Priority for {suggestion.value}</span>
                  <select
                    value={suggestion.bucket}
                    onChange={(event) =>
                      onBucketChange(index, event.target.value as RequirementBucket)
                    }
                  >
                    <option value="must_have">Must have</option>
                    <option value="preferred">Preferred</option>
                    <option value="nice_to_have">Nice to have</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => onRemove(index)}
                  aria-label={`Remove ${suggestion.value}`}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <button type="button" className="primary-button" onClick={onConfirm}>
        Use these requirements
      </button>
    </section>
  );
}
