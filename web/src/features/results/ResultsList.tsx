import type { ResearchQuery } from "../../types/query";
import type { RankedResult } from "../../types/results";
import { DatasetCard } from "./DatasetCard";

interface ResultsListProps {
  results: RankedResult[];
  query?: ResearchQuery | null;
  isSearching?: boolean;
}

export function ResultsList({ results, query, isSearching = false }: ResultsListProps) {
  const mentioned = results.filter((result) => (result.named_dataset_matches?.length ?? 0) > 0);
  const bestMatches = results.filter(
    (result) =>
      (result.named_dataset_matches?.length ?? 0) === 0 &&
      (result.match_tier ?? 0) > 0,
  );
  const alternatives = results.filter(
    (result) =>
      (result.named_dataset_matches?.length ?? 0) === 0 &&
      (result.match_tier ?? 0) === 0,
  );
  const unresolved = (query?.requirements.named_datasets ?? [])
    .filter((reference) => reference.role !== "context_only")
    .filter(
      (reference) =>
        !results.some((result) => result.named_dataset_matches?.includes(reference.name)),
    );

  return (
    <section className="results-section" aria-labelledby="results-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Matches</p>
          <h2 id="results-title">Datasets that fit your context</h2>
        </div>
        {results.length > 0 ? <span className="step-count">{results.length} results</span> : null}
      </div>
      {isSearching ? (
        <p className="empty-state">Searching the local catalog...</p>
      ) : results.length === 0 ? (
        <p className="empty-state">
          Confirm your requirements and start a search to see ranked datasets.
        </p>
      ) : (
        <div className="result-groups">
          {unresolved.length > 0 ? (
            <section className="result-group unresolved-group" aria-labelledby="unresolved-title">
              <h3 id="unresolved-title">Mentioned in paper, not found in current catalog</h3>
              <ul className="unresolved-list">
                {unresolved.map((reference) => (
                  <li key={reference.name}>
                    <strong>{reference.name}</strong> · {reference.role.replace("_", " ")}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <ResultGroup title="Paper-mentioned datasets" results={mentioned} startIndex={0} />
          <ResultGroup
            title="Best research matches"
            results={bestMatches}
            startIndex={mentioned.length}
          />
          <ResultGroup
            title="Related alternatives"
            results={alternatives}
            startIndex={mentioned.length + bestMatches.length}
          />
        </div>
      )}
    </section>
  );
}

function ResultGroup({
  title,
  results,
  startIndex,
}: {
  title: string;
  results: RankedResult[];
  startIndex: number;
}) {
  if (results.length === 0) return null;
  return (
    <section className="result-group" aria-labelledby={`result-group-${slug(title)}`}>
      <h3 id={`result-group-${slug(title)}`}>{title}</h3>
      <div className="results-grid">
        {results.map((result, index) => (
          <DatasetCard
            key={result.dataset.identity.id}
            result={result}
            position={startIndex + index + 1}
          />
        ))}
      </div>
    </section>
  );
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
