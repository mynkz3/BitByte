# BitByte Research-Context Retrieval Redesign

**Date:** 2026-10-20
**Status:** Design approved in conversation; implementation not started
**Scope:** Research-context extraction, dataset identity, catalog coverage, ranking, and result explanations

## Problem

BitByte currently treats a research paper or idea as a flat collection of
keyword suggestions and sends the original document into a BM25-style text
ranker. This causes generic or incidental words such as `graph`, `image`,
`text`, `MAE`, and `RMSE` to compete with the actual research subject. Named
datasets such as ESOL, BACE, and Lipophilicity are not extracted as entities,
and they are not guaranteed to be searchable when they appear only in a source
identifier or citation.

The current catalog is also too shallow for the intended behavior: the live
pipeline samples 100 records per general source and has no canonical registry
for well-known research benchmark names. A stronger extractor alone cannot
return a dataset that is absent or poorly identified in the catalog.

## Product outcome

BitByte will turn a research idea or paper into an explainable research
context, then rank datasets using a layered retrieval strategy:

1. Paper-mentioned dataset identities and aliases.
2. Subject, data object, task, and target/property compatibility.
3. Practical constraints and verified availability.
4. Metadata quality and freshness.
5. Controlled lexical similarity as a low-weight fallback.

The result is still a privacy-first static application. Research text remains
local to the browser. No external LLM call is required. A local semantic model
may be added later only if measured tests show that deterministic extraction
cannot cover common paraphrases.

## Approved decisions

- Explicitly named datasets are shown separately from alternatives.
- Exact or registered-alias matches are prioritized, but alternatives remain
  visible.
- A named dataset can be marked `anchor`, `comparison`, or `context_only`.
- Framework and model mentions are experiment context, not dominant dataset
  requirements.
- Evaluation metrics are evaluation context, not dataset identity.
- The first deep-search implementation expands the local catalog rather than
  adding runtime web crawling.
- The first semantic layer is deterministic and explainable.
- A local semantic model is an optional later phase; external LLM use is out of
  scope by default.

## Goals

- Correctly extract named datasets, research subjects, data objects, tasks,
  targets/properties, experiment context, metrics, and constraints.
- Preserve evidence snippets and confidence for every inferred item.
- Prevent generic terms and repeated paper text from overpowering named or
  structured research matches.
- Make source IDs, aliases, citation names, and canonical names searchable.
- Include an initial curated chemistry benchmark registry covering common
  MoleculeNet/DeepChem-style names.
- Make unresolved paper-mentioned datasets visible rather than silently
  dropping them.
- Keep the ranking and explanation behavior deterministic and testable.

## Non-goals

- Calling an external LLM or sending research documents to a third-party API.
- Runtime crawling of arbitrary dataset websites.
- Downloading complete dataset contents to the browser.
- OCR for scanned PDFs in this redesign.
- Automatically claiming metadata that a source or curated registry does not
  verify.
- Using framework names as a general framework/library search. Framework
  discovery can be a separate future product mode.

## User flows

### Chemistry paper with named benchmarks

For a paper mentioning ESOL, BACE, Lipophilicity, molecular property
prediction, molecular graphs/GNNs, a new framework, MAE, and RMSE, the context
confirmation view should contain:

- Named dataset: ESOL — paper-mentioned — anchor
- Named dataset: BACE — paper-mentioned — anchor
- Named dataset: Lipophilicity — paper-mentioned — anchor
- Subject/domain: chemistry or molecular property prediction — inferred
- Data object: molecule or molecular graph — inferred
- Task: regression — inferred when supported by the wording and target
- Framework/model: GNN or named framework — experiment context
- Metrics: MAE and RMSE — evaluation context

After confirmation:

- exact or alias records for the three named datasets appear in the
  **Paper-mentioned datasets** group;
- chemistry and molecular-property alternatives appear in **Best research
  matches**;
- unrelated cybersecurity records do not outrank them because they mention a
  generic framework, graph, or metric term;
- a named dataset absent from the current catalog remains visible as
  **mentioned in paper, not found in current catalog**.

### Natural-language image idea

For “I want to train a machine-learning model on images around cats,” BitByte
should infer:

- goal: training;
- subject: cats/animals;
- data object: images;
- likely task: classification, with lower confidence unless classification is
  explicitly stated.

The researcher can correct the task to detection, segmentation, or another
choice before searching. BitByte must not invent graph, text, MAE, or RMSE
requirements from this input.

### Ambiguous or negative language

The extractor must distinguish a primary requirement from incidental context:

- “not an image dataset” must not create a required image modality;
- “we compare against graph models” must not automatically make graph data a
  primary requirement;
- metrics discussed in an evaluation section must not become dataset names;
- references, captions, and bibliography text must have lower influence than
  title, abstract, introduction, methods, and dataset sections.

## Research-context model

The existing modality/task/domain query groups remain useful, but they are not
enough to represent the researcher’s intent. The shared query contract will be
extended with explicit context groups.

### Extracted suggestion

Every suggestion will continue to carry:

- `field`;
- canonical `value`;
- original `evidence_text`;
- confidence;
- source/context classification (`explicit`, `inferred`, or `catalog_metadata`);
- optional section and role information.

The new fields are:

- `named_dataset`;
- `subject`;
- `data_object`;
- `framework`;
- `model`;
- `evaluation_metric`;
- existing `modality`, `task`, `domain`, `target`, `language`, and `license`.

`data_object` describes what the data represents (for example, molecule,
molecular_graph, cat, or patient record), while `modality` describes how the
data is represented or delivered (for example, graph, image, text, or
tabular). The two fields can both be present and are intentionally not
interchangeable.

The extractor will return a deterministic list of suggestions. It will not
silently convert low-confidence suggestions into hard constraints.

### Confirmation roles

The existing `must_have`, `preferred`, and `nice_to_have` controls will remain
for ordinary requirements. Named datasets will additionally have a role:

- `anchor`: prioritize exact/alias matches in the paper-mentioned group;
- `comparison`: show exact/alias matches with a moderate boost;
- `context_only`: display the paper reference but do not use it for ranking.

An anchor is not an exclusive hard filter. This preserves alternatives when an
anchor is absent from the catalog or when the researcher wants comparable
datasets.

### Framework and metric isolation

Frameworks, models, and metrics will be stored in a context section rather
than copied into the general source-text query with the same weight as domain
and target terms. They will be shown in the confirmation and result evidence,
but will not independently make a dataset relevant.

The only indirect framework signal allowed in the first phase is an explicit
data-object implication already supported by the context model. For example,
GNN may support a low-confidence molecular-graph suggestion, but the chemistry
subject and molecular property target remain the primary signals.

## Dataset-record model

Dataset records will gain explicit identity and research-fit fields rather than
hiding them in an unindexed attributes object.

### Identity additions

`identity` will include a unique normalized `aliases` list. Alias provenance
will be represented in evidence where available. Aliases can come from:

- canonical dataset name;
- source ID;
- source-specific title;
- citation name;
- known benchmark alias;
- explicitly verified cross-source mapping.

`canonical_url`, `alternate_urls`, and source provenance remain authoritative
links; an alias is never treated as proof of a dataset’s content by itself.

### Research-fit additions

`fit` will explicitly support:

- `subjects` for research topics such as chemistry, animals, or molecular
  property prediction;
- `data_objects` for molecule, molecular_graph, image, document, and similar
  objects;
- existing `modalities`, `tasks`, `domains`, and `targets`;
- evidence for each populated field.

Unknown fields remain unknown. A missing task or target is not converted into a
positive compatibility match.

### Shared schema migration

The dataset and query schemas, Rust models, Python Pydantic models, and
TypeScript types must change together. The schema version will advance from
`0.1.0` to `0.2.0` for this contract change. Fixture catalogs and manifests
will be regenerated or migrated as part of the implementation.

## Canonical dataset registry

A checked-in, versioned registry will provide stable identity for well-known
research datasets. Each entry contains:

- canonical name;
- aliases and spelling variants;
- source URLs and source IDs when known;
- subject/domain;
- data object and modality;
- task and target/property;
- evidence level and notes;
- optional citation identifiers.

The initial chemistry pack will include, when authoritative metadata can be
verified:

- ESOL / Delaney solubility;
- BACE;
- Lipophilicity;
- BBBP;
- Tox21;
- ClinTox;
- HIV;
- SIDER;
- QM7, QM8, and QM9.

Registry records are catalog identities and crosswalks, not a replacement for
source metadata. If a source does not report a field, the registry must mark it
as unknown or cite the source that supports it. The registry will have its own
schema because a registry crosswalk is not necessarily a complete runtime
`DatasetRecord`; registry entries will be materialized into full dataset
records before catalog publication and those materialized records must pass the
dataset schema.

## Catalog build and coverage

The catalog remains a static, versioned artifact generated outside the browser.
The browser performs local loading, caching, retrieval, and ranking.

### General sources

Keep the existing Hugging Face, OpenML, and UCI adapters, but improve them as
follows:

- use source-specific pagination and filters;
- enforce a deterministic per-source cap after extraction;
- include source IDs and titles in searchable identity text;
- normalize source-provided tasks only when the source field supports that
  interpretation;
- do not infer `classification` merely because a description contains a
  generic classification word;
- preserve evidence and unknown values;
- deduplicate records while retaining alternate URLs and provenance.

The current first-page sample will be replaced with a broader, deterministic
harvest of an initial **500 records per general source** (1,500 broad-source
records total), plus domain-focused registry records outside that cap. The
source adapters must paginate or slice deterministically so this cap is real;
the cap can be reduced only if the measured artifact or build-time quality gate
requires it. The chemistry registry guarantees named-dataset coverage
independent of general-source ordering.

### Build safety

The existing last-known-good source snapshot behavior remains required:

- successful refreshes atomically replace source snapshots;
- failed or empty source responses use the previous snapshot when available;
- stale sources are recorded in the manifest;
- a failed source with no valid snapshot fails the build rather than publishing
  a silently incomplete catalog.

The catalog report will include source counts, registry counts, stale sources,
unknown-field counts, and validation errors/warnings.

## Retrieval and ranking

### Exact identity matching

Named-dataset matching is a distinct comparator, not ordinary BM25. Values are
normalized for case, punctuation, whitespace, and registered spelling aliases.
Matching uses whole-name equality against:

- canonical name;
- aliases;
- source ID;
- citation name.

Unsafe substring matching is not allowed. `ESOL` does not equal `ESOL-v2`
unless that relationship is explicitly registered.

### Structured context scoring

For each candidate, calculate separate components for:

- named-dataset identity;
- subject/domain;
- data object/modality;
- task;
- target/property;
- constraints and splits;
- verification and quality;
- low-weight lexical relevance.

The ranker will use a tiered ordering so generic lexical terms cannot outrank a
strong identity or research-context match:

1. Paper-mentioned anchor identity matches.
2. Paper-mentioned comparison identity matches.
3. Strong subject/target/data-object/task matches.
4. Practical and quality fit among similarly relevant records.
5. Lexical/context alternatives without strong structured evidence.

Within a tier, deterministic weighted scores and stable dataset-ID tie breaks
will preserve reproducibility.

### Lexical controls

The BM25-style fallback will be changed so that:

- query terms are deduplicated;
- repeated occurrences in a paper are capped;
- generic terms have lower field/context weight;
- title, abstract, methods, and dataset sections receive more weight than
  references and captions;
- identity aliases are indexed for discovery but exact identity matching is
  still scored separately.

The original full paper will not be allowed to dominate simply because a term
appears many times.

### Frameworks and metrics

Framework/model context and metrics will not be independent relevance scores
in the first phase. They will:

- appear in the context confirmation view;
- be included in explanations;
- support future explicit framework or benchmark modes;
- optionally provide a low-confidence data-object hint when the language makes
  that implication clear.

MAE/RMSE can become a ranking signal only in a future query mode that explicitly
  asks for benchmark/evaluation compatibility and whose catalog records contain
  verified metric metadata.

## User interface

The confirmation section will be grouped instead of rendering all suggestions
as one undifferentiated list:

1. **Paper-mentioned datasets** — with anchor/comparison/context-only role.
2. **Research context** — subject, data object, task, target, constraints.
3. **Experiment context** — frameworks and models.
4. **Evaluation context** — metrics.

Every item will show:

- the normalized value;
- evidence text;
- confidence or evidence level;
- whether it was explicit, inferred, or catalog-derived;
- the control used to edit, remove, or change its role.

Results will be grouped as:

1. **Paper-mentioned datasets**;
2. **Best research matches**;
3. **Related alternatives**.

Every result card will expose the score components and a concise reason such
as “Exact alias match for ESOL,” “Matches molecular-property target,” or
“Framework context noted but not used as the primary dataset signal.”

Unresolved named datasets will be visible above the alternatives with their
source evidence and a clear statement that they are not in the current catalog.

## Verification strategy

Implementation is test-first for each behavior change. The following cases are
required before the redesign is considered complete.

### Extraction tests

- chemistry paper fixture extracts ESOL, BACE, and Lipophilicity as named
  datasets;
- GNN/framework mentions are classified as experiment context;
- MAE/RMSE are classified as evaluation context;
- molecular property prediction yields chemistry/target context;
- whole-word matching prevents `paragraph`, `context`, and similar text from
  creating graph requirements;
- negated and comparative phrases do not become unconditional must-have
  requirements;
- repeated aliases produce one suggestion with stable evidence;
- a cat-image idea yields image + cat/animal context and only a cautious likely
  classification task;
- TypeScript fallback behavior remains aligned with the Rust/WASM extractor.

### Catalog tests

- canonical registry entries validate against the dataset schema;
- ESOL, BACE, and Lipophilicity aliases normalize to stable identities;
- records match when the name appears in title, source ID, citation, or alias;
- unsafe substring matches are rejected;
- source metadata and curated metadata preserve evidence separately;
- generic descriptions do not create unsupported classification labels;
- source pagination and caps are deterministic;
- stale and empty source fallback remains safe;
- catalog reports include registry and unknown-field counts.

### Ranking tests

- exact paper-mentioned chemistry datasets outrank unrelated cybersecurity
  records;
- target/domain/data-object matches outrank generic lexical matches;
- an unresolved named dataset remains visible without producing a false exact
  result;
- context-only named datasets do not affect ranking;
- comparison datasets receive less identity weight than anchors;
- repeated raw paper terms do not change the order of otherwise equivalent
  structured candidates;
- hard constraints still exclude incompatible records;
- explanations identify exact aliases, structured context, unknowns, and
  framework/metric context correctly.

### Browser tests

- pasted natural-language idea flows through confirmation and grouped results;
- uploaded chemistry paper flows through extraction, role editing, and grouped
  results;
- the confirmation screen preserves user edits;
- the WASM bridge transports the new numeric score components without breaking
  the existing browser ABI;
- stale catalog loading still falls back to the last known-good local cache.

### Quality gates

The implementation must pass the existing Rust, Python, TypeScript, unit,
production-build, and Playwright checks. A catalog build must validate every
record and manifest against the updated schemas. No accuracy number will be
reported until a repeatable benchmark fixture has actually been run.

## Implementation order

The work will proceed in independently verifiable slices:

1. Add failing extraction and schema tests for context fields and named
   datasets.
2. Update shared schemas and models.
3. Implement deterministic section-aware, boundary-aware extraction and
   TypeScript fallback parity.
4. Add the canonical dataset registry and source normalization/identity
   support.
5. Add failing ranker tests, then implement exact identity and structured
   context ranking.
6. Extend the stable numeric WASM bridge and browser query/result mapping.
7. Update the confirmation and result UI with grouped context and explanations.
8. Expand catalog harvesting and add catalog quality reports.
9. Run the full regression suite, build a production catalog, and validate the
   deployed static flow.

## Risks and mitigations

- **Rules do not cover every phrasing:** preserve manual confirmation and
  measure failures; add a local semantic model only as a later, bounded phase.
- **Curated aliases become stale:** version the registry, preserve source URLs,
  and report provenance and unknown fields.
- **Catalog grows too large for the browser:** measure artifact size and search
  time; add a compact prebuilt index without changing the public query model.
- **Extraction over-infers a task:** use confidence and evidence, avoid hard
  filters for uncertain suggestions, and test negative/comparative language.
- **WASM ABI regressions:** keep numeric transport, add explicit tuple-length
  tests, and run the real browser E2E test after bridge changes.
- **Live source instability:** retain atomic source snapshots and stale-source
  fallback; never publish a partial source as fresh.

## Definition of done

The redesign is complete when a chemistry paper containing ESOL, BACE,
Lipophilicity, GNN, MAE, and RMSE produces the expected grouped context; exact
named datasets and chemistry alternatives rank above unrelated datasets; a
natural-language cat-image idea produces sensible editable context; unresolved
names remain visible; all explanations identify the evidence behind ranking;
the full test/build suite passes; and a versioned static catalog containing the
curated chemistry registry is deployed successfully.
