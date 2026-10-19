import type { QueryPriorities } from "../../types/query";

interface PriorityControlsProps {
  priorities: QueryPriorities;
  onChange: (priorities: QueryPriorities) => void;
}

const LABELS: Record<keyof QueryPriorities, string> = {
  text_relevance: "Text relevance",
  task_compatibility: "Task fit",
  modality_compatibility: "Modality fit",
  domain_target_match: "Domain and target fit",
  constraint_satisfaction: "Requirement satisfaction",
  evaluation_readiness: "Evaluation readiness",
  quality_practical_fit: "Quality and practical fit",
};

export function PriorityControls({ priorities, onChange }: PriorityControlsProps) {
  return (
    <section className="workflow-card" aria-labelledby="priority-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Step 3</p>
          <h2 id="priority-title">Tune the ranking</h2>
        </div>
      </div>
      <p className="section-copy">
        Raise the signals that matter most to your experiment. BitByte keeps
        the score breakdown visible.
      </p>
      <div className="priority-list">
        {(Object.keys(LABELS) as Array<keyof QueryPriorities>).map((key) => (
          <label className="priority-row" key={key}>
            <span>{LABELS[key]}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={priorities[key]}
              onChange={(event) =>
                onChange({ ...priorities, [key]: Number(event.target.value) })
              }
            />
            <output>{Math.round(priorities[key] * 100)}%</output>
          </label>
        ))}
      </div>
    </section>
  );
}
