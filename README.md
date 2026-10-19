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
npm run dev
npm run typecheck
npm test
npm run build
npm run build:wasm
npm run test:catalog
npm run test:rust
```

## Project areas

- `web/` — browser application and researcher workflow
- `engine/` — Rust/WASM retrieval and ranking engine
- `indexer/` — build-time catalog indexer
- `catalog_builder/` — source adapters and metadata normalization
- `schema/` — shared dataset, query, and taxonomy contracts

The first useful vertical slice is: research idea → confirmed requirements →
ranked fixture datasets with score explanations.
