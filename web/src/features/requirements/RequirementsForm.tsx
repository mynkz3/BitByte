import {
  FIELD_LABELS,
  type EditableRequirement,
  type RequirementBucket,
} from "./requirementsState";
import type { NamedDatasetRole } from "../research-input/requirementTypes";

interface RequirementsFormProps {
  suggestions: EditableRequirement[];
  onBucketChange: (index: number, bucket: RequirementBucket) => void;
  onRoleChange?: (index: number, role: NamedDatasetRole) => void;
  onRemove: (index: number) => void;
  onConfirm: () => void;
}

const GROUPS: Array<{ title: string; fields: string[] }> = [
  { title: "Paper-mentioned datasets", fields: ["named_dataset"] },
  {
    title: "Research context",
    fields: ["subject", "data_object", "modality", "task", "domain", "target", "context_goal"],
  },
  { title: "Experiment context", fields: ["framework", "model"] },
  { title: "Evaluation context", fields: ["evaluation_metric"] },
];

export function RequirementsForm({
  suggestions,
  onBucketChange,
  onRoleChange,
  onRemove,
  onConfirm,
}: RequirementsFormProps) {
  const grouped = GROUPS.map((group) => ({
    ...group,
    items: suggestions
      .map((suggestion, index) => ({ suggestion, index }))
      .filter(({ suggestion }) => group.fields.includes(suggestion.field)),
  })).filter((group) => group.items.length > 0);
  const otherItems = suggestions
    .map((suggestion, index) => ({ suggestion, index }))
    .filter(({ suggestion }) => !GROUPS.some((group) => group.fields.includes(suggestion.field)));

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
        BitByte found these signals locally. Decide what is essential and what is
        only a preference before searching.
      </p>
      {suggestions.length === 0 ? (
        <p className="empty-state">
          No requirements were detected yet. Add more context to your research
          description.
        </p>
      ) : (
        <div className="requirement-groups">
          {grouped.map((group) => (
            <section
              className="requirement-group"
              key={group.title}
              aria-labelledby={`group-${slug(group.title)}`}
            >
              <h3 id={`group-${slug(group.title)}`}>{group.title}</h3>
              <div className="requirement-list">
                {group.items.map(({ suggestion, index }) => (
                  <RequirementRow
                    key={`${suggestion.field}-${suggestion.value}`}
                    suggestion={suggestion}
                    index={index}
                    onBucketChange={onBucketChange}
                    onRoleChange={onRoleChange}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            </section>
          ))}
          {otherItems.length > 0 ? (
            <section className="requirement-group" aria-labelledby="group-other">
              <h3 id="group-other">Other signals</h3>
              <div className="requirement-list">
                {otherItems.map(({ suggestion, index }) => (
                  <RequirementRow
                    key={`${suggestion.field}-${suggestion.value}`}
                    suggestion={suggestion}
                    index={index}
                    onBucketChange={onBucketChange}
                    onRoleChange={onRoleChange}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
      <button type="button" className="primary-button" onClick={onConfirm}>
        Use these requirements
      </button>
    </section>
  );
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

interface RequirementRowProps {
  suggestion: EditableRequirement;
  index: number;
  onBucketChange: (index: number, bucket: RequirementBucket) => void;
  onRoleChange?: (index: number, role: NamedDatasetRole) => void;
  onRemove: (index: number) => void;
}

function RequirementRow({
  suggestion,
  index,
  onBucketChange,
  onRoleChange,
  onRemove,
}: RequirementRowProps) {
  const isDataset = suggestion.field === "named_dataset";
  return (
    <article className="requirement-row">
      <div>
        <span className="requirement-field">
          {FIELD_LABELS[suggestion.field] ?? suggestion.field}
        </span>
        <strong>{suggestion.value.replaceAll("_", " ")}</strong>
        <p className="evidence-text">“{suggestion.evidence_text}”</p>
        <p className="requirement-evidence">
          {suggestion.source ?? "explicit"} · {Math.round(suggestion.confidence * 100)}% confidence
        </p>
      </div>
      <div className="requirement-controls">
        {isDataset ? (
          <label>
            <span className="sr-only">Role for {suggestion.value}</span>
            <select
              aria-label={`Role for ${suggestion.value}`}
              value={suggestion.named_dataset_role ?? suggestion.role ?? "anchor"}
              onChange={(event) =>
                onRoleChange?.(index, event.target.value as NamedDatasetRole)
              }
            >
              <option value="anchor">Anchor</option>
              <option value="comparison">Comparison</option>
              <option value="context_only">Context only</option>
            </select>
          </label>
        ) : null}
        <label>
          <span className="sr-only">Priority for {suggestion.value}</span>
          <select
            aria-label={`Priority for ${suggestion.value}`}
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
  );
}
