import type { RankedResult } from "../../types/results";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { SourceLink } from "./SourceLink";

interface DatasetCardProps {
  result: RankedResult;
  position: number;
}

export function DatasetCard({ result, position }: DatasetCardProps) {
  const { dataset } = result;
  return (
    <article className="dataset-card">
      <div className="dataset-card-topline">
        <span className="result-position">#{position}</span>
        <span className="score-badge">{result.score.toFixed(1)} / 100</span>
      </div>
      <h3>{dataset.content.title}</h3>
      <p className="dataset-summary">{dataset.content.summary || "No summary reported."}</p>
      <div className="tag-list" aria-label="Dataset properties">
        {[...dataset.fit.modalities, ...dataset.fit.tasks, ...dataset.fit.domains]
          .slice(0, 6)
          .map((tag) => (
            <span className="tag" key={tag}>
              {tag.replaceAll("_", " ")}
            </span>
          ))}
      </div>
      <div className="dataset-meta">
        <span>{dataset.identity.source}</span>
        <span>{dataset.practical.license.label ?? "License not reported"}</span>
        <span>{dataset.quality.availability_status}</span>
      </div>
      <ul className="explanation-list">
        {result.explanation_items.slice(0, 4).map((item) => (
          <li className={`explanation-${item.tone}`} key={`${item.category}-${item.text}`}>
            <span aria-hidden="true">{item.tone === "positive" ? "✓" : "△"}</span>
            {item.text}
          </li>
        ))}
      </ul>
      <ScoreBreakdown breakdown={result.score_breakdown} />
      <SourceLink href={dataset.identity.canonical_url} source={dataset.identity.source} />
    </article>
  );
}
