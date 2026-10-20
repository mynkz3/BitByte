# Research-Context Retrieval Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace BitByte’s flat keyword/BM25 behavior with explainable research-context extraction, exact paper-mentioned dataset matching, an enriched chemistry-aware catalog, and layered ranking that keeps generic framework and metric terms from dominating.

**Architecture:** Keep the privacy-first static architecture and deterministic Rust/WASM engine. Add explicit context fields and dataset aliases to the shared contracts, materialize a curated canonical dataset registry into the static catalog, rank exact named identities and structured context ahead of controlled lexical fallback, and expose the new evidence through the existing numeric WASM bridge.

**Tech Stack:** Rust 2021, Serde, WASM-bindgen, TypeScript, React, Vite, Python 3.12, Pydantic, JSON Schema, httpx, pytest, Vitest, Playwright, GitHub Pages.

---

## File map

### Shared contracts and fixtures

- Modify: `schema/dataset.schema.json` — dataset aliases, subjects, and data objects.
- Modify: `schema/query.schema.json` — named-dataset roles, subject/data-object groups, and experiment context.
- Create: `schema/dataset-registry.schema.json` — canonical registry entry contract.
- Modify: `schema/taxonomy.json` — chemistry, animal, molecule, molecular graph, and related terms.
- Modify: `catalog_builder/src/bitbyte_catalog/models.py` — Pydantic contract parity.
- Modify: `engine/src/model.rs` — Rust contract parity.
- Modify: `web/src/types/catalog.ts` and `web/src/types/query.ts` — browser contract parity.
- Modify: `catalog_builder/tests/fixtures/valid_dataset.json` and `catalog_builder/tests/fixtures/valid_query.json` — schema fixtures.
- Create: `catalog_builder/tests/fixtures/chemistry_registry.json` — registry test fixture.

### Context extraction

- Modify: `engine/src/requirements.rs` — boundary-aware, evidence-aware deterministic extractor.
- Modify: `engine/src/lib.rs` — keep the existing extraction ABI while serializing the richer suggestions.
- Modify: `web/src/features/research-input/localExtractor.ts` — TypeScript fallback parity.
- Modify: `web/src/features/research-input/requirementTypes.ts` — suggestion source/section metadata.
- Modify: `web/src/features/research-input/extractRequirements.ts` — stable deduplication for richer suggestions.
- Test: the existing `#[cfg(test)]` module in `engine/src/requirements.rs` — keep extraction tests next to the extractor.

### Catalog and registry

- Create: `catalog_builder/src/bitbyte_catalog/registry.py` — load and materialize canonical registry entries.
- Create: `catalog_builder/src/bitbyte_catalog/registry/datasets.json` — initial chemistry benchmark aliases and verified source links.
- Modify: `catalog_builder/src/bitbyte_catalog/normalize.py` — aliases, subjects, data objects, and explicit-task handling.
- Modify: `catalog_builder/src/bitbyte_catalog/build.py` — merge registry records into live/fixture builds and report registry counts.
- Modify: `catalog_builder/src/bitbyte_catalog/sources/base.py` — deterministic source limits/pagination contract.
- Modify: `catalog_builder/src/bitbyte_catalog/sources/huggingface.py`, `openml.py`, and `uci.py` — identity aliases and conservative normalization.
- Modify: `catalog_builder/tests/test_adapters.py`, `test_build.py`, `test_normalize.py`, and `test_schema.py`.
- Create: `catalog_builder/tests/test_registry.py` — registry validation/materialization tests.

### Ranking and browser bridge

- Modify: `engine/src/index.rs` — identity/context indexing and deduplicated query terms.
- Modify: `engine/src/ranking.rs` — exact identity matching, context components, tiered ordering, and explanations.
- Modify: `engine/src/lib.rs` — extend the numeric result tuple deterministically.
- Modify: `engine/tests/ranking_tests.rs` — chemistry-vs-distractor and identity ranking tests.
- Modify: `web/src/lib/wasm/bitbyteEngine.ts` — decode the extended tuple and present explanations.
- Modify: `web/src/types/results.ts` — new score components and match metadata.
- Modify: `web/src/lib/wasm/bitbyteEngine.test.ts` — tuple-length and explanation tests.

### Confirmation and result UI

- Modify: `web/src/features/requirements/requirementsState.ts` — field labels and named-dataset roles.
- Modify: `web/src/features/requirements/queryBuilder.ts` — preserve context and named-dataset roles instead of dropping unknown fields.
- Modify: `web/src/features/requirements/RequirementsForm.tsx` — grouped context confirmation.
- Modify: `web/src/features/requirements/queryBuilder.test.ts` and related component tests.
- Modify: `web/src/app/App.tsx` — pass unresolved named datasets/context into results.
- Modify: `web/src/features/results/ResultsList.tsx` — paper-mentioned, best-match, and alternatives groups.
- Modify: `web/src/features/results/DatasetCard.tsx` and `ScoreBreakdown.tsx` — exact-match/context evidence.
- Modify: `web/src/styles.css` — grouped result and unresolved-name presentation.
- Modify: `web/e2e/research-search.spec.ts` — chemistry and natural-language flows.
- Create: `web/e2e/fixtures/chemistry-paper.txt` — deterministic paper-like regression input.

---

## Task 1: Establish the shared context and identity contract

**Files:**
- Modify: `schema/dataset.schema.json`, `schema/query.schema.json`, `schema/taxonomy.json`.
- Create: `schema/dataset-registry.schema.json`.
- Modify: `catalog_builder/src/bitbyte_catalog/models.py`, `engine/src/model.rs`, `web/src/types/catalog.ts`, `web/src/types/query.ts`.
- Modify: `catalog_builder/tests/fixtures/valid_dataset.json`, `catalog_builder/tests/fixtures/valid_query.json`.
- Create: `catalog_builder/tests/fixtures/chemistry_registry.json`.
- Test: `catalog_builder/tests/test_models.py`, `catalog_builder/tests/test_schema.py`.

- [ ] **Step 1: Add failing contract tests.**

Add tests that require the following shapes:

```python
def test_dataset_contract_accepts_aliases_and_research_fit() -> None:
    payload = read_fixture("valid_dataset.json")
    payload["identity"]["aliases"] = ["ESOL", "Delaney solubility"]
    payload["fit"]["subjects"] = ["chemistry"]
    payload["fit"]["data_objects"] = ["molecule", "molecular_graph"]

    record = DatasetRecord.model_validate(payload)

    assert record.identity.aliases == ["ESOL", "Delaney solubility"]
    assert record.fit.data_objects == ["molecule", "molecular_graph"]


def test_query_contract_preserves_named_dataset_roles_and_context() -> None:
    payload = read_fixture("valid_query.json")
    payload["requirements"]["named_datasets"] = [
        {"name": "ESOL", "role": "anchor"}
    ]
    payload["requirements"]["subjects"] = {
        "must_have": ["chemistry"], "preferred": [], "excluded": []
    }
    payload["requirements"]["data_objects"] = {
        "must_have": ["molecular_graph"], "preferred": [], "excluded": []
    }
    payload["context"] = {
        "goals": ["training"],
        "frameworks": ["gnn"],
        "models": [],
        "metrics": ["mae", "rmse"],
    }

    query = ResearchQuery.model_validate(payload)

    assert query.requirements.named_datasets[0].role == "anchor"
    assert query.context.frameworks == ["gnn"]
```

Add the same fields to the JSON-schema fixtures and assert the registry fixture
passes `Draft202012Validator` against `dataset-registry.schema.json`.

- [ ] **Step 2: Run the focused tests and verify RED.**

Run:

```bash
PATH="/tmp/bitbyte-venv/bin:$PATH" PYTHONPATH="/c/Users/mayan/BitByte/catalog_builder/src" \
  python -m pytest catalog_builder/tests/test_models.py catalog_builder/tests/test_schema.py -q
```

Expected: FAIL because the new fields do not yet exist.

- [ ] **Step 3: Implement the contract additions.**

Add these exact concepts across all four representations:

```text
DatasetIdentity.aliases: string[]
DatasetFit.subjects: string[]
DatasetFit.data_objects: string[]
QueryRequirements.named_datasets: NamedDatasetReference[]
QueryRequirements.subjects: MatchGroup
QueryRequirements.data_objects: MatchGroup
ResearchQuery.context: QueryContext
QueryContext.goals/frameworks/models/metrics: string[]
NamedDatasetReference.name: string
NamedDatasetReference.role: anchor | comparison | context_only
```

Use schema version `0.2.0`. Keep `aliases`, `subjects`, and `data_objects`
required in new records with empty arrays allowed. Keep context arrays required
with empty arrays allowed so the contract stays deterministic.

- [ ] **Step 4: Run the focused tests and verify GREEN.**

Run the same pytest command. Expected: all focused model/schema tests pass.

- [ ] **Step 5: Run existing catalog tests for migration regressions.**

```bash
PATH="/tmp/bitbyte-venv/bin:$PATH" PYTHONPATH="/c/Users/mayan/BitByte/catalog_builder/src" \
  python -m pytest catalog_builder/tests -q
```

Expected: all existing tests pass with migrated fixtures.

- [ ] **Step 6: Commit.**

```bash
git add schema catalog_builder/src/bitbyte_catalog/models.py engine/src/model.rs \
  web/src/types/catalog.ts web/src/types/query.ts catalog_builder/tests
git commit -m "feat: define research context and dataset identity contracts"
```

## Task 2: Replace keyword extraction with deterministic context extraction

**Files:**
- Modify: `engine/src/requirements.rs`, `web/src/features/research-input/localExtractor.ts`.
- Modify: `web/src/features/research-input/requirementTypes.ts`, `extractRequirements.ts`.
- Modify: `engine/src/lib.rs` only if the richer serialized suggestion type requires a bridge adjustment.
- Test: Rust module tests and `web/src/features/research-input/extractRequirements.test.ts`.

- [ ] **Step 1: Add failing Rust extraction tests.**

Add tests for the exact approved behaviors:

```rust
#[test]
fn extracts_chemistry_named_datasets_and_separates_context() {
    let result = extract_requirements(
        "We evaluate molecular property prediction on ESOL, BACE, and Lipophilicity "
        .to_owned() + "with a new GNN framework using MAE and RMSE.",
    );

    assert!(has(&result, "named_dataset", "ESOL"));
    assert!(has(&result, "named_dataset", "BACE"));
    assert!(has(&result, "named_dataset", "Lipophilicity"));
    assert!(has(&result, "framework", "gnn"));
    assert!(has(&result, "evaluation_metric", "mae"));
    assert!(has(&result, "evaluation_metric", "rmse"));
    assert!(has(&result, "subject", "chemistry"));
    assert!(has(&result, "data_object", "molecular_graph"));
}

#[test]
fn uses_boundaries_and_negation_for_generic_terms() {
    let result = extract_requirements(
        "This is not an image dataset. Paragraph text compares graph models only.",
    );

    assert!(!has(&result, "modality", "image"));
    assert!(!has(&result, "modality", "graph"));
}

#[test]
fn infers_cautious_context_for_cat_image_training_idea() {
    let result = extract_requirements("I want to train a machine-learning model on images around cats.");

    assert!(has(&result, "data_object", "cat"));
    assert!(has(&result, "modality", "image"));
    assert!(has(&result, "context_goal", "training"));
    assert!(confidence(&result, "task", "classification") < 0.8);
}
```

Implement small test helpers `has` and `confidence` inside the test module.

- [ ] **Step 2: Run the Rust extraction tests and verify RED.**

```bash
/root/.cargo/bin/cargo test -p bitbyte-engine requirements::tests -- --nocapture
```

Expected: FAIL because named datasets, context fields, boundary checks, and
negation are not implemented.

- [ ] **Step 3: Implement the Rust extractor.**

Replace unrestricted `lower.find(alias)` checks with a deterministic matcher
that:

1. checks whole-word/whole-phrase boundaries;
2. captures the original evidence span;
3. rejects a match when the preceding local window contains `not`, `without`,
   `except`, or `rather than`;
4. assigns `explicit` evidence to direct dataset/framework/metric mentions;
5. adds the canonical named-dataset aliases for ESOL, BACE, Lipophilicity,
   BBBP, Tox21, ClinTox, HIV, SIDER, QM7, QM8, and QM9;
6. adds chemistry, molecular-property, animal, cat, molecule, and
   molecular-graph context rules;
7. treats `GNN` and framework/model names as context fields;
8. infers `classification` for the cat-image training pattern only with lower
   confidence than an explicit classification phrase;
9. deduplicates by `(field, canonical_value)` and preserves the strongest
   evidence;
10. sorts suggestions by stable field order, then canonical value.

Do not add an external NLP dependency or LLM call.

- [ ] **Step 4: Run Rust extraction tests and verify GREEN.**

```bash
/root/.cargo/bin/cargo test -p bitbyte-engine requirements::tests -- --nocapture
```

Expected: all requirement tests pass.

- [ ] **Step 5: Add the TypeScript fallback parity tests.**

Extend `extractRequirements.test.ts` to call `localKeywordExtractor` directly
for the cat and chemistry examples and assert the same canonical fields are
present. Add a test that `cleanDocumentText` plus deduplication retains one
named-dataset suggestion per alias.

- [ ] **Step 6: Implement fallback parity.**

Mirror the Rust matcher’s canonical rules, boundary checks, negation window,
context fields, named dataset aliases, confidence levels, and stable evidence
format in `localExtractor.ts`. Keep the fallback deterministic and local.

- [ ] **Step 7: Run browser extraction tests.**

```bash
PATH="/root/.cargo/bin:/usr/local/bin:/usr/bin:/bin" /usr/local/bin/npm \
  test -- --run web/src/features/research-input/extractRequirements.test.ts
```

Expected: all extraction tests pass.

- [ ] **Step 8: Commit.**

```bash
git add engine/src/requirements.rs engine/src/lib.rs \
  web/src/features/research-input
git commit -m "feat: extract research context and named datasets"
```

## Task 3: Add canonical dataset registry and conservative catalog normalization

**Files:**
- Modify: `schema/dataset-registry.schema.json` — keep the registry contract from Task 1 aligned with materialization.
- Create: `catalog_builder/src/bitbyte_catalog/registry.py`.
- Create: `catalog_builder/src/bitbyte_catalog/registry/datasets.json`.
- Modify: `catalog_builder/src/bitbyte_catalog/normalize.py`, `build.py`, and all three source adapters.
- Modify: `catalog_builder/tests/test_registry.py`, `test_adapters.py`, `test_build.py`, `test_normalize.py`, and `test_live_build.py`.

- [ ] **Step 1: Add the registry fixture and failing tests.**

Create a registry fixture with these canonical records:

```json
[
  {
    "canonical_name": "ESOL",
    "aliases": ["Delaney solubility", "delaney"],
    "source": "curated",
    "source_ids": ["esol", "delaney"],
    "source_urls": ["https://deepchem.readthedocs.io/en/latest/api_reference/moleculenet.html"],
    "subjects": ["chemistry", "molecular_property_prediction"],
    "data_objects": ["molecule", "molecular_graph"],
    "modalities": ["graph"],
    "tasks": ["regression"],
    "targets": ["solubility"],
    "evidence_level": "curated_reference"
  },
  {
    "canonical_name": "BACE",
    "aliases": ["bace classification"],
    "source": "curated",
    "source_ids": ["bace"],
    "source_urls": ["https://deepchem.readthedocs.io/en/latest/api_reference/moleculenet.html"],
    "subjects": ["chemistry", "molecular_property_prediction"],
    "data_objects": ["molecule", "molecular_graph"],
    "modalities": ["graph"],
    "tasks": ["classification"],
    "targets": ["binding"],
    "evidence_level": "curated_reference"
  },
  {
    "canonical_name": "Lipophilicity",
    "aliases": ["delaney lipophilicity", "lipophilicity"],
    "source": "curated",
    "source_ids": ["lipophilicity"],
    "source_urls": ["https://deepchem.readthedocs.io/en/latest/api_reference/moleculenet.html"],
    "subjects": ["chemistry", "molecular_property_prediction"],
    "data_objects": ["molecule", "molecular_graph"],
    "modalities": ["graph"],
    "tasks": ["regression"],
    "targets": ["lipophilicity"],
    "evidence_level": "curated_reference"
  }
]
```

Add tests:

```python
def test_registry_materializes_named_chemistry_records() -> None:
    records = load_registry_records(REGISTRY_FIXTURE)
    names = {record.content.title for record in records}

    assert {"ESOL", "BACE", "Lipophilicity"} <= names
    esol = next(record for record in records if record.content.title == "ESOL")
    assert "Delaney solubility" in esol.identity.aliases
    assert esol.fit.data_objects == ["molecule", "molecular_graph"]


def test_source_id_is_searchable_identity_alias() -> None:
    record = HuggingFaceAdapter().normalize({"id": "mynkz3/ESOL", "tags": []})

    assert "mynkz3/ESOL" in record.identity.aliases
    assert "mynkz3/ESOL" in record.content.search_text
```

- [ ] **Step 2: Run registry and adapter tests and verify RED.**

```bash
PATH="/tmp/bitbyte-venv/bin:$PATH" PYTHONPATH="/c/Users/mayan/BitByte/catalog_builder/src" \
  python -m pytest catalog_builder/tests/test_registry.py catalog_builder/tests/test_adapters.py -q
```

Expected: FAIL because the registry loader and alias fields do not exist.

- [ ] **Step 3: Implement registry loading and materialization.**

Implement `load_registry_entries(path: Path) -> list[RegistryEntry]` and
`materialize_registry_records(entries) -> list[DatasetRecord]` in
`registry.py`. Validate each entry against `dataset-registry.schema.json`,
normalize aliases, assign `source="curated"`, and create evidence entries that
identify curated metadata and the source URL. Do not invent record counts,
licenses, splits, or availability.

Add an optional `registry_records: Iterable[DatasetRecord] = ()` argument to
`build_catalog` and pass materialized registry records from both fixture and
live CLI paths before deduplication. Registry records must deduplicate against source records by
canonical identity or an explicitly registered source ID while retaining
alternate URLs and provenance.

- [ ] **Step 4: Extend normalization and adapters.**

Change `make_record` to accept `aliases`, `subjects`, and `data_objects` and to
include identity aliases in `content.search_text`. Update Hugging Face, OpenML,
and UCI adapters to add source IDs, titles, and canonical names to aliases.

Remove task inference from arbitrary descriptions. Keep source task fields and
explicit taxonomy tags; only call `infer_tasks` for an explicit source task or
an explicit task phrase in the source’s task metadata. Unknown source task
values remain empty.

- [ ] **Step 5: Run catalog tests and verify GREEN.**

```bash
PATH="/tmp/bitbyte-venv/bin:$PATH" PYTHONPATH="/c/Users/mayan/BitByte/catalog_builder/src" \
  python -m pytest catalog_builder/tests -q
```

Expected: all catalog tests pass, including the registry and existing stale
source fallback tests.

- [ ] **Step 6: Commit.**

```bash
git add schema/dataset-registry.schema.json schema/taxonomy.json \
  catalog_builder/src/bitbyte_catalog catalog_builder/tests
git commit -m "feat: add canonical dataset registry and identity aliases"
```

## Task 4: Implement layered ranking and extend the stable WASM bridge

**Files:**
- Modify: `engine/src/index.rs`, `engine/src/ranking.rs`, `engine/src/lib.rs`.
- Modify: `engine/tests/ranking_tests.rs`.
- Modify: `web/src/lib/wasm/bitbyteEngine.ts`, `web/src/types/results.ts`, and `web/src/lib/wasm/bitbyteEngine.test.ts`.

- [ ] **Step 1: Add failing ranking tests.**

Add fixture constructors for three records:

```text
chemistry_esol:
  aliases = ["ESOL", "Delaney solubility"]
  subjects = ["chemistry", "molecular_property_prediction"]
  data_objects = ["molecule", "molecular_graph"]
  modalities = ["graph"]
  tasks = ["regression"]
  targets = ["solubility"]

chemistry_alternative:
  aliases = ["AqSolDB"]
  same chemistry context but no ESOL alias

cybersecurity_distractor:
  aliases = ["cyber graph benchmark"]
  summary mentions graph, MAE, RMSE, and framework
  subjects = ["cybersecurity"]
```

Add tests:

```rust
#[test]
fn exact_paper_dataset_beats_generic_framework_and_metric_overlap() {
    let mut query = chemistry_query();
    query.requirements.named_datasets = vec![NamedDatasetReference {
        name: "ESOL".to_owned(),
        role: "anchor".to_owned(),
    }];

    let results = chemistry_engine().search(&query, 10).unwrap();

    assert_eq!(results[0].dataset.identity.id, "curated:ESOL");
    assert!(results[0].score_breakdown.named_dataset_match > 0.0);
    assert!(results[0]
        .explanation_items
        .iter()
        .any(|item| item.text.contains("ESOL")));
}

#[test]
fn context_only_named_dataset_does_not_change_ranking() {
    let mut query = chemistry_query();
    query.requirements.named_datasets = vec![NamedDatasetReference {
        name: "ESOL".to_owned(),
        role: "context_only".to_owned(),
    }];

    let results = chemistry_engine().search(&query, 10).unwrap();

    assert_eq!(results[0].score_breakdown.named_dataset_match, 0.0);
}

#[test]
fn repeated_source_text_terms_do_not_overpower_structured_context() {
    let mut query = chemistry_query();
    query.source_text = "graph graph graph MAE RMSE framework".to_owned();

    let results = chemistry_engine().search(&query, 10).unwrap();

    assert_ne!(results[0].dataset.identity.source, "cybersecurity");
}
```

- [ ] **Step 2: Run ranking tests and verify RED.**

```bash
/root/.cargo/bin/cargo test -p bitbyte-engine --test ranking_tests -- --nocapture
```

Expected: compile/test failures because the new fields and score component do
not exist.

- [ ] **Step 3: Add identity/context indexing.**

Include `identity.aliases`, `identity.source_id`, `fit.subjects`, and
`fit.data_objects` in the indexed document. Change query tokenization to use a
deduplicated term set with a maximum contribution of one occurrence per term.
Keep the existing title/tag/structured-field weights, but add aliases as
identity text for fallback discovery only.

- [ ] **Step 4: Implement exact identity and structured scores.**

Add `named_dataset_match`, `subject_compatibility`, and
`data_object_compatibility` to `ScoreBreakdown` and the TypeScript type. Implement
whole-normalized equality against aliases, source IDs, and canonical titles.

Use role behavior:

```text
anchor       -> identity tier 3 and exact score 1.0
comparison   -> identity tier 2 and exact score 0.75
context_only -> identity score 0.0 and no tier contribution
```

Compute the final rank with a stable `(tier, structured_score, lexical_score,
dataset_id)` ordering. Keep the displayed `score` in the existing 0–100 range
by mapping the tier and within-tier score to a bounded value. Do not make
anchors hard filters.

Add explanations for exact alias/name matches, subject/data-object matches,
unknown fields, and framework/metric context. Ensure `unverified_requirements`
contains named datasets or structured fields that are requested but absent.

- [ ] **Step 5: Extend the numeric tuple without changing ABI semantics.**

Change the numeric result row from ten values to thirteen values in this exact
order:

```text
dataset_index,
score,
named_dataset_match,
text_relevance,
task_compatibility,
modality_compatibility,
subject_compatibility,
data_object_compatibility,
domain_target_match,
constraint_satisfaction,
evaluation_readiness,
quality_practical_fit,
total
```

Update the TypeScript decoder and its mocked binding test. The bridge must
reject malformed row lengths by ignoring incomplete trailing rows, matching the
existing safe behavior.

- [ ] **Step 6: Run Rust and bridge tests and verify GREEN.**

```bash
/root/.cargo/bin/cargo fmt --all -- --check
/root/.cargo/bin/cargo clippy --workspace --all-targets -- -D warnings
/root/.cargo/bin/cargo test --workspace
PATH="/root/.cargo/bin:/usr/local/bin:/usr/bin:/bin" /usr/local/bin/npm \
  test -- --run web/src/lib/wasm/bitbyteEngine.test.ts
```

Expected: all commands pass.

- [ ] **Step 7: Commit.**

```bash
git add engine web/src/lib/wasm/bitbyteEngine.ts web/src/types/results.ts
git commit -m "feat: rank exact dataset identities before lexical matches"
```

## Task 5: Build grouped confirmation and result explanations

**Files:**
- Modify: `web/src/features/requirements/requirementsState.ts`, `queryBuilder.ts`, `RequirementsForm.tsx`.
- Modify: `web/src/features/research-input/requirementTypes.ts` if role/source metadata is not complete from Task 2.
- Modify: `web/src/app/App.tsx`, `web/src/features/results/ResultsList.tsx`, `DatasetCard.tsx`, `ScoreBreakdown.tsx`, and `web/src/styles.css`.
- Test: `web/src/features/requirements/queryBuilder.test.ts`, component tests, and `web/e2e/research-search.spec.ts`.
- Create: `web/e2e/fixtures/chemistry-paper.txt`.

- [ ] **Step 1: Add failing query-builder tests.**

Add this test case:

```typescript
it("keeps named dataset roles and separates experiment context", () => {
  const query = buildResearchQuery(
    "A new GNN framework evaluates molecular property prediction with MAE and RMSE.",
    [
      {
        field: "named_dataset",
        value: "ESOL",
        evidence_text: "ESOL",
        confidence: 0.95,
        bucket: "preferred",
        named_dataset_role: "anchor",
      },
      {
        field: "framework",
        value: "gnn",
        evidence_text: "GNN framework",
        confidence: 0.95,
        bucket: "preferred",
      },
      {
        field: "evaluation_metric",
        value: "mae",
        evidence_text: "MAE",
        confidence: 0.95,
        bucket: "nice_to_have",
      },
    ],
    DEFAULT_PRIORITIES,
  );

  expect(query.requirements.named_datasets).toEqual([
    { name: "ESOL", role: "anchor" },
  ]);
  expect(query.context.frameworks).toEqual(["gnn"]);
  expect(query.context.metrics).toEqual(["mae"]);
  expect(query.source_text).not.toContain("Evaluation metrics: mae");
});
```

- [ ] **Step 2: Run the focused browser test and verify RED.**

```bash
PATH="/root/.cargo/bin:/usr/local/bin:/usr/bin:/bin" /usr/local/bin/npm \
  test -- --run web/src/features/requirements/queryBuilder.test.ts
```

Expected: FAIL because named dataset roles and context are currently dropped or
appended to source text.

- [ ] **Step 3: Implement query preservation and confirmation grouping.**

Extend `EditableRequirement` with `named_dataset_role` defaulting to `anchor`
for explicit dataset mentions and `comparison` for registry-derived alternatives.
Map ordinary fields to the existing match groups, named datasets to
`requirements.named_datasets`, subjects/data objects to their new groups, and
frameworks/models/metrics to `query.context`. Do not append metrics or
framework names to the high-weight source query.

Update `RequirementsForm` to render four stable groups:

```text
Paper-mentioned datasets
Research context
Experiment context
Evaluation context
```

Keep remove and priority controls. Show evidence and confidence/source labels.
Named dataset rows get a role selector with `Anchor`, `Comparison`, and
`Context only`.

- [ ] **Step 4: Add failing grouped-result tests.**

Add component tests that render:

- a named ESOL result with an “Exact alias match” explanation;
- an unresolved BACE mention with “not found in current catalog”;
- a chemistry alternative in “Best research matches”;
- a generic result in “Related alternatives”.

Expected: the current flat result list fails these assertions.

- [ ] **Step 5: Implement grouped results and evidence cards.**

Pass the confirmed query/context and unresolved named dataset references from
`App.tsx` to `ResultsList`. Group results using exact match metadata first, then
the structured match tier. Render unresolved names before alternatives. Update
`DatasetCard` to show aliases, subjects/data objects, exact identity badges,
unknown/unverified notices, and the new score components. Keep the existing
source link and score breakdown.

- [ ] **Step 6: Add the chemistry paper browser fixture and E2E assertions.**

Create `web/e2e/fixtures/chemistry-paper.txt` containing a short deterministic
paper-like text with ESOL, BACE, Lipophilicity, molecular property prediction,
GNN, MAE, and RMSE. Extend the Playwright test to:

1. paste the fixture;
2. analyze it;
3. assert named datasets and experiment/evaluation context are visible;
4. choose `Anchor` for ESOL and `Context only` for BACE;
5. confirm requirements;
6. assert the paper-mentioned group and exact-match explanation.

Keep the existing cat/image happy path as a separate browser test.

- [ ] **Step 7: Run browser tests and verify GREEN.**

```bash
PATH="/root/.cargo/bin:/usr/local/bin:/usr/bin:/bin" /usr/local/bin/npm \
  test -- --run
PATH="/root/.cargo/bin:/usr/local/bin:/usr/bin:/bin" /usr/local/bin/npm run test:e2e
```

Expected: all Vitest and Playwright tests pass.

- [ ] **Step 8: Commit.**

```bash
git add web/src web/e2e
git commit -m "feat: explain research context and paper-mentioned datasets"
```

## Task 6: Expand catalog builds, regenerate artifacts, and verify deployment

**Files:**
- Modify: `catalog_builder/src/bitbyte_catalog/build.py`, `__main__.py`, and `sources/base.py` to enforce the 500-record cap in every live source path.
- Modify: `.github/workflows/catalog.yml`, `.github/workflows/deploy.yml`, and `README.md`.
- Modify: `catalog_builder/tests/test_live_build.py` and add catalog quality assertions.
- Regenerate: `web/public/catalog/fixture-catalog/` using the checked-in registry.

- [ ] **Step 1: Add failing live-build quality tests.**

Add assertions that a fixture/live build:

```python
def test_build_report_counts_registry_and_preserves_named_records(tmp_path):
    report = build_catalog(
        [fixture_record()],
        output_dir=tmp_path,
        catalog_version="registry-test",
        source_versions={"fixture": "test"},
        registry_records=load_registry_records(REGISTRY_FIXTURE),
    )

    assert report["registry_count"] == 3
    assert report["record_count"] >= report["registry_count"]
    assert any(
        record["identity"]["id"] == "curated:ESOL"
        for record in json.loads((tmp_path / "records.json").read_text())
    )
```

Add a source adapter test that requests/returns a limit of 500 and verifies the
builder caps oversized output before link verification and cache writing.

- [ ] **Step 2: Run live/catalog tests and verify RED.**

```bash
PATH="/tmp/bitbyte-venv/bin:$PATH" PYTHONPATH="/c/Users/mayan/BitByte/catalog_builder/src" \
  python -m pytest catalog_builder/tests/test_build.py catalog_builder/tests/test_live_build.py -q
```

Expected: FAIL because registry counts and the expanded build output are not
implemented.

- [ ] **Step 3: Implement registry-aware build reporting and source cap.**

Load registry records in the fixture and live CLI paths, merge before dedupe,
and add `registry_count` plus `unknown_field_counts` to the report. Set the
workflow/source default to 500 and preserve the existing atomic cache and stale
fallback behavior. Keep link verification bounded to the capped records.

- [ ] **Step 4: Regenerate the checked-in fixture catalog.**

```bash
PATH="/tmp/bitbyte-venv/bin:$PATH" PYTHONPATH="/c/Users/mayan/BitByte/catalog_builder/src" \
  python -m bitbyte_catalog build \
    --fixtures catalog_builder/tests/fixtures \
    --output web/public/catalog/fixture-catalog \
    --catalog-version fixture-catalog
```

Verify the generated catalog contains `curated:ESOL`, `curated:BACE`, and
`curated:Lipophilicity`, and that the manifest schema version is `0.2.0`.

- [ ] **Step 5: Run the catalog and complete project checks.**

```bash
PATH="/tmp/bitbyte-venv/bin:$PATH" PYTHONPATH="/c/Users/mayan/BitByte/catalog_builder/src" \
  python -m pytest catalog_builder/tests -q
/root/.cargo/bin/cargo fmt --all -- --check
/root/.cargo/bin/cargo clippy --workspace --all-targets -- -D warnings
/root/.cargo/bin/cargo test --workspace
PATH="/root/.cargo/bin:/usr/local/bin:/usr/bin:/bin" /usr/local/bin/npm run typecheck
PATH="/root/.cargo/bin:/usr/local/bin:/usr/bin:/bin" /usr/local/bin/npm test -- --run
PATH="/root/.cargo/bin:/usr/local/bin:/usr/bin:/bin" /usr/local/bin/npm run build
PATH="/root/.cargo/bin:/usr/local/bin:/usr/bin:/bin" /usr/local/bin/npm run test:e2e
```

Expected: every command exits zero.

- [ ] **Step 6: Update workflow and documentation.**

Change catalog workflow limits to 500, validate the registry count and schema
version, and preserve the GitHub Pages artifact layout. Document that the
catalog contains broad source records plus curated canonical research datasets.

- [ ] **Step 7: Commit the catalog and integration slice.**

```bash
git add catalog_builder .github/workflows README.md web/public/catalog
git commit -m "feat: publish expanded research dataset catalog"
```

## Final verification and handoff

- [ ] Inspect `git status`, `git diff`, and all commits on
  `feat/research-context-retrieval`.
- [ ] Run `git diff --check` and confirm generated artifacts are intentional.
- [ ] Run the full command set from Task 6 again after the final commit.
- [ ] Push only this feature branch after the user’s explicit push instruction.
- [ ] Open a pull request or merge only after the GitHub Actions CI and Pages
  deployment checks are green.

## Self-review checklist

- [x] Spec coverage: context extraction, named dataset identity, registry,
  catalog expansion, layered ranking, UI evidence, and required regression
  scenarios each map to a task above.
- [x] No unresolved design placeholders remain; the initial general-source cap
  is 500 records per source and the schema version is 0.2.0.
- [x] Type consistency: `NamedDatasetReference`, `QueryContext`, aliases,
  subjects, data objects, and the thirteen-value WASM row are defined once and
  referenced consistently in the contract, ranking, and bridge tasks.
- [x] External LLM calls and runtime crawling remain explicitly out of scope.
