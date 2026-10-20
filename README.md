# BitByte

BitByte is a privacy-first dataset discovery platform for machine-learning
researchers. A researcher can describe an idea or provide a text-based paper,
confirm the extracted requirements, and receive an explainable ranking of
relevant datasets.

The runtime application is designed to be a static web app. Research input,
search, and ranking happen locally in the browser. A scheduled catalog builder
will publish verified metadata from Hugging Face Datasets, OpenML, and UCI.

## Development commands

```powershell
npm install
python -m pip install -e "catalog_builder[test]"
npm run dev
npm run typecheck
npm test
npm run build
npm run build:wasm
npm run test:catalog
npm run test:rust
npm run test:e2e
```

## Project areas

- `web/` — browser application and researcher workflow
- `engine/` — Rust/WASM retrieval and ranking engine
- `indexer/` — build-time catalog indexer
- `catalog_builder/` — source adapters and metadata normalization
- `schema/` — shared dataset, query, and taxonomy contracts

The first useful vertical slice is: research idea → confirmed requirements →
ranked fixture datasets with score explanations.

## Catalog refresh and deployment

The scheduled catalog workflow fetches metadata from Hugging Face Datasets,
OpenML, and UCI, verifies source links, and publishes a versioned static
catalog artifact. A failed source can fall back to its last successful source
snapshot and is marked stale in the manifest.

Run a local live refresh from PowerShell or Bash:

The catalog builder requires Python 3.12 or newer. Install its editable package
once from the repository root before running a refresh:

```bash
python -m pip install -e "catalog_builder[test]"
```

```powershell
./scripts/build-catalog.ps1 -Limit 25
```

```bash
./scripts/build-catalog.sh
```

GitHub Actions deploys the static app and catalog to GitHub Pages. No runtime
API server, GPU, or paid service is required.
