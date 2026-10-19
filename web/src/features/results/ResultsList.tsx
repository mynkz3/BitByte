import type { RankedResult } from "../../types/results";
import { DatasetCard } from "./DatasetCard";

interface ResultsListProps {
  results: RankedResult[];
  isSearching?: boolean;
}

export function ResultsList({ results, isSearching = false }: ResultsListProps) {
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
        <div className="results-grid">
          {results.map((result, index) => (
            <DatasetCard key={result.dataset.identity.id} result={result} position={index + 1} />
          ))}
        </div>
      )}
    </section>
  );
}
