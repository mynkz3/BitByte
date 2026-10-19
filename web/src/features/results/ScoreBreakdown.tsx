import type { ScoreBreakdown as ScoreBreakdownData } from "../../types/results";

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownData;
}

const LABELS: Array<[keyof Omit<ScoreBreakdownData, "total">, string]> = [
  ["text_relevance", "Text relevance"],
  ["task_compatibility", "Task fit"],
  ["modality_compatibility", "Modality fit"],
  ["domain_target_match", "Domain and target"],
  ["constraint_satisfaction", "Requirements"],
  ["evaluation_readiness", "Evaluation readiness"],
  ["quality_practical_fit", "Quality and practical fit"],
];

export function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  return (
    <details className="score-details">
      <summary>Why this ranked {breakdown.total.toFixed(2)}</summary>
      <ul>
        {LABELS.map(([key, label]) => (
          <li key={key}>
            <span>{label}</span>
            <strong>{breakdown[key].toFixed(2)}</strong>
          </li>
        ))}
      </ul>
    </details>
  );
}
