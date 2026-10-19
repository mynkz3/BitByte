import { useState } from "react";
import { CatalogStatus } from "../features/catalog/CatalogStatus";
import { extractDocxText } from "../lib/documents/docxText";
import { extractPdfText } from "../lib/documents/pdfText";
import { extractRequirementsFromText } from "../features/research-input/extractRequirements";
import { localKeywordExtractor } from "../features/research-input/localExtractor";
import { ResearchInput } from "../features/research-input/ResearchInput";
import { PriorityControls } from "../features/requirements/PriorityControls";
import {
  RequirementsForm,
  } from "../features/requirements/RequirementsForm";
import {
  toEditableRequirements,
  type EditableRequirement,
  type RequirementBucket,
} from "../features/requirements/requirementsState";
import { ResultsList } from "../features/results/ResultsList";
import type { QueryPriorities } from "../types/query";

const DEFAULT_PRIORITIES: QueryPriorities = {
  text_relevance: 0.3,
  task_compatibility: 0.2,
  modality_compatibility: 0.15,
  domain_target_match: 0.15,
  constraint_satisfaction: 0.1,
  evaluation_readiness: 0.05,
  quality_practical_fit: 0.05,
};

export function App() {
  const [researchText, setResearchText] = useState("");
  const [suggestions, setSuggestions] = useState<EditableRequirement[]>([]);
  const [priorities, setPriorities] = useState(DEFAULT_PRIORITIES);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const analyzeResearch = () => {
    if (!researchText.trim()) return;
    const extracted = extractRequirementsFromText(researchText, localKeywordExtractor);
    setSuggestions(toEditableRequirements(extracted.suggestions));
    setConfirmed(false);
    setError(null);
  };

  const handleFileSelected = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const text =
        extension === "pdf"
          ? await extractPdfText(file)
          : extension === "docx"
            ? await extractDocxText(file)
            : await file.text();
      setResearchText(text);
    } catch {
      setError("We could not read that file. Try a text-based PDF, DOCX, or pasted text.");
    } finally {
      setIsProcessing(false);
    }
  };

  const changeBucket = (index: number, bucket: RequirementBucket) => {
    setSuggestions((current) =>
      current.map((suggestion, suggestionIndex) =>
        suggestionIndex === index ? { ...suggestion, bucket } : suggestion,
      ),
    );
  };

  return (
    <main className="app-page">
      <header className="site-header">
        <a className="brand" href="/BitByte/" aria-label="BitByte home">
          <span className="brand-mark">B</span>
          <span>BitByte</span>
        </a>
        <CatalogStatus status="loading" message="Preparing the local catalog" />
      </header>
      <section className="page-intro" aria-labelledby="app-title">
        <p className="eyebrow">Research data, without the scavenger hunt</p>
        <h1 id="app-title">Find data that fits your research.</h1>
        <p className="hero-copy">
          Describe a project or share a research paper. BitByte extracts the
          context locally and makes dataset matches explainable.
        </p>
      </section>
      <div className="workflow-layout">
        <div className="workflow-column">
          <ResearchInput
            value={researchText}
            onValueChange={setResearchText}
            onSubmit={analyzeResearch}
            onFileSelected={handleFileSelected}
            isProcessing={isProcessing}
            error={error}
          />
          <RequirementsForm
            suggestions={suggestions}
            onBucketChange={changeBucket}
            onRemove={(index) =>
              setSuggestions((current) => current.filter((_, itemIndex) => itemIndex !== index))
            }
            onConfirm={() => setConfirmed(true)}
          />
          <PriorityControls priorities={priorities} onChange={setPriorities} />
          {confirmed ? (
            <p className="confirmation-note" role="status">
              Requirements confirmed. The catalog search engine will use these
              priorities when the catalog is ready.
            </p>
          ) : null}
        </div>
        <ResultsList results={[]} />
      </div>
    </main>
  );
}
