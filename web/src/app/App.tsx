import { useEffect, useState } from "react";
import { CatalogStatus } from "../features/catalog/CatalogStatus";
import type { CatalogStatusValue } from "../features/catalog/CatalogStatus";
import { loadCatalog } from "../features/catalog/catalogLoader";
import { extractDocxText } from "../lib/documents/docxText";
import { extractPdfText } from "../lib/documents/pdfText";
import { loadWasmEngine, type WasmSearchEngine } from "../lib/wasm/bitbyteEngine";
import { extractRequirementsFromText } from "../features/research-input/extractRequirements";
import { localKeywordExtractor } from "../features/research-input/localExtractor";
import { ResearchInput } from "../features/research-input/ResearchInput";
import { PriorityControls } from "../features/requirements/PriorityControls";
import { RequirementsForm } from "../features/requirements/RequirementsForm";
import { buildResearchQuery } from "../features/requirements/queryBuilder";
import {
  toEditableRequirements,
  type EditableRequirement,
  type RequirementBucket,
} from "../features/requirements/requirementsState";
import { ResultsList } from "../features/results/ResultsList";
import type { NamedDatasetRole, QueryPriorities, ResearchQuery } from "../types/query";
import type { RankedResult } from "../types/results";

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
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatusValue>("loading");
  const [catalogMessage, setCatalogMessage] = useState("Preparing the local catalog");
  const [wasmEngine, setWasmEngine] = useState<WasmSearchEngine | null>(null);
  const [results, setResults] = useState<RankedResult[]>([]);
  const [confirmedQuery, setConfirmedQuery] = useState<ResearchQuery | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    if (typeof window === "undefined" || typeof fetch === "undefined") return undefined;

    void loadCatalog()
      .then(async (loaded) => {
        const engine = await loadWasmEngine(loaded.artifact);
        if (!active) return;
        setWasmEngine(engine);
        setCatalogStatus("ready");
        setCatalogMessage(
          loaded.warning ?? `Catalog ${loaded.manifest.catalog_version} is ready`,
        );
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setCatalogStatus("error");
        setCatalogMessage(
          loadError instanceof Error ? loadError.message : "The catalog could not be loaded",
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const analyzeResearch = () => {
    if (!researchText.trim()) return;
    const extractor = wasmEngine
      ? { extract: (text: string) => wasmEngine.extractRequirements(text) }
      : localKeywordExtractor;
    const extracted = extractRequirementsFromText(researchText, extractor);
    setSuggestions(toEditableRequirements(extracted.suggestions));
    setConfirmed(false);
    setConfirmedQuery(null);
    setResults([]);
    setError(null);
  };

  const searchCatalog = () => {
    setConfirmed(true);
    if (!wasmEngine) {
      setError("The local catalog is still loading. Try again in a moment.");
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const query = buildResearchQuery(researchText, suggestions, priorities);
      setConfirmedQuery(query);
      setResults(wasmEngine.search(query, 10));
    } catch (searchError: unknown) {
      setResults([]);
      setError(searchError instanceof Error ? searchError.message : "The search failed");
    } finally {
      setIsSearching(false);
    }
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

  const changeDatasetRole = (index: number, role: NamedDatasetRole) => {
    setSuggestions((current) =>
      current.map((suggestion, suggestionIndex) =>
        suggestionIndex === index
          ? { ...suggestion, role, named_dataset_role: role }
          : suggestion,
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
        <CatalogStatus status={catalogStatus} message={catalogMessage} />
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
            onRoleChange={changeDatasetRole}
            onRemove={(index) =>
              setSuggestions((current) => current.filter((_, itemIndex) => itemIndex !== index))
            }
            onConfirm={searchCatalog}
          />
          <PriorityControls priorities={priorities} onChange={setPriorities} />
          {confirmed ? (
            <p className="confirmation-note" role="status">
              Requirements confirmed. The catalog search engine will use these
              priorities when the catalog is ready.
            </p>
          ) : null}
        </div>
          <ResultsList results={results} query={confirmedQuery} isSearching={isSearching} />
      </div>
    </main>
  );
}
