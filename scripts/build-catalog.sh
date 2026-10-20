#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
export PYTHONPATH="$repo_root/catalog_builder/src${PYTHONPATH:+:$PYTHONPATH}"

version="${BITBYTE_CATALOG_VERSION:-local-$(date -u +%Y%m%dT%H%M%SZ)}"
limit="${BITBYTE_CATALOG_LIMIT:-500}"

args=(
  -m bitbyte_catalog live
  --output "${BITBYTE_CATALOG_OUTPUT:-catalog/build}"
  --source-cache "${BITBYTE_SOURCE_CACHE:-catalog/source-cache}"
  --catalog-version "$version"
  --limit "$limit"
)

if [[ "${BITBYTE_SKIP_LINK_CHECK:-0}" == "1" ]]; then
  args+=(--skip-link-check)
fi

python "${args[@]}"
