from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from jsonschema import validate

from .dedupe import deduplicate_records
from .models import DatasetRecord


ROOT = Path(__file__).resolve().parents[3]
SCHEMA_DIR = ROOT / "schema"


def build_catalog(
    records: Iterable[DatasetRecord],
    *,
    output_dir: Path,
    catalog_version: str,
    source_versions: dict[str, str],
    stale_sources: list[str] | None = None,
) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    deduplicated = deduplicate_records(list(records))
    serialized_records = [record.model_dump(mode="json") for record in deduplicated]

    dataset_schema = _read_schema("dataset.schema.json")
    for record in serialized_records:
        validate(record, dataset_schema)

    generated_at = _utc_timestamp()
    manifest = {
        "catalog_version": catalog_version,
        "schema_version": "0.1.0",
        "generated_at": generated_at,
        "source_versions": source_versions,
        "record_counts": {
            "total": len(serialized_records),
            **_source_counts(deduplicated),
        },
        "stale_sources": stale_sources or [],
        "validation_summary": {"valid": True, "warnings": 0, "errors": 0},
    }
    validate(manifest, _read_schema("catalog-manifest.schema.json"))

    artifact = {
        "catalog_version": catalog_version,
        "schema_version": "0.1.0",
        "records": serialized_records,
    }
    report = {
        "catalog_version": catalog_version,
        "generated_at": generated_at,
        "record_count": len(serialized_records),
        "sources": _source_counts(deduplicated),
        "stale_sources": stale_sources or [],
    }

    _write_json(output_dir / "records.json", serialized_records)
    _write_json(output_dir / "index-input.json", artifact)
    _write_json(output_dir / "manifest.json", manifest)
    _write_json(output_dir / "source-status.json", _source_status(deduplicated, stale_sources or []))
    _write_json(output_dir / "build-report.json", report)
    return report


def _read_schema(name: str) -> dict:
    return json.loads((SCHEMA_DIR / name).read_text(encoding="utf-8"))


def _write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _source_counts(records: list[DatasetRecord]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for record in records:
        counts[record.identity.source] = counts.get(record.identity.source, 0) + 1
    return counts


def _source_status(records: list[DatasetRecord], stale_sources: list[str]) -> dict:
    status = {
        source: {"record_count": count, "stale": source in stale_sources}
        for source, count in _source_counts(records).items()
    }
    for source in stale_sources:
        status.setdefault(source, {"record_count": 0, "stale": True})
    return status


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
