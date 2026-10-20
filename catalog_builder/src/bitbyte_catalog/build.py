from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Protocol

import httpx
from jsonschema import validate

from .dedupe import deduplicate_records
from .models import DatasetRecord


ROOT = Path(__file__).resolve().parents[3]
SCHEMA_DIR = ROOT / "schema"


class CatalogBuildError(RuntimeError):
    """Raised when a live catalog cannot be built safely."""


class CatalogSource(Protocol):
    name: str

    def fetch_records(self, client: httpx.Client, limit: int) -> list[DatasetRecord]:
        ...


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
        "schema_version": "0.2.0",
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
        "schema_version": "0.2.0",
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


def build_live_catalog(
    adapters: Iterable[CatalogSource],
    *,
    output_dir: Path,
    source_cache_dir: Path,
    catalog_version: str,
    source_limit: int = 100,
    verify_links: bool = True,
    client: httpx.Client | None = None,
) -> dict:
    """Fetch all configured sources with last-known-good source fallback."""

    if source_limit <= 0:
        raise ValueError("source_limit must be positive")

    output_dir.mkdir(parents=True, exist_ok=True)
    source_cache_dir.mkdir(parents=True, exist_ok=True)
    owns_client = client is None
    http_client = client or httpx.Client(
        follow_redirects=True,
        timeout=30.0,
        headers={"User-Agent": "BitByte catalog builder/0.1"},
    )
    records: list[DatasetRecord] = []
    stale_sources: list[str] = []
    source_versions: dict[str, str] = {}

    try:
        for adapter in adapters:
            cache_path = source_cache_dir / f"{adapter.name}.json"
            try:
                source_records = adapter.fetch_records(http_client, source_limit)
                source_records = source_records[:source_limit]
                if not source_records:
                    raise ValueError("source returned no records")
                if verify_links:
                    from .link_verification import verify_record_link

                    source_records = [
                        verify_record_link(record, http_client) for record in source_records
                    ]
                _write_json(cache_path, [record.model_dump(mode="json") for record in source_records])
                source_versions[adapter.name] = _utc_timestamp()
            except Exception as error:
                if not cache_path.exists():
                    raise CatalogBuildError(
                        f"source {adapter.name} failed and has no cached snapshot: {error}"
                    ) from error
                try:
                    cached_payload = json.loads(cache_path.read_text(encoding="utf-8"))
                    source_records = [
                        DatasetRecord.model_validate(record) for record in cached_payload
                    ]
                except (OSError, json.JSONDecodeError, ValueError) as cache_error:
                    raise CatalogBuildError(
                        f"source {adapter.name} failed and its cached snapshot is invalid: "
                        f"{cache_error}"
                    ) from error
                stale_sources.append(adapter.name)
                source_versions[adapter.name] = "cached"
            records.extend(source_records)
    finally:
        if owns_client:
            http_client.close()

    if not records:
        raise CatalogBuildError("all catalog sources returned zero records")

    return build_catalog(
        records,
        output_dir=output_dir,
        catalog_version=catalog_version,
        source_versions=source_versions,
        stale_sources=stale_sources,
    )


def _read_schema(name: str) -> dict:
    return json.loads((SCHEMA_DIR / name).read_text(encoding="utf-8"))


def _write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary:
            temporary_path = Path(temporary.name)
            json.dump(value, temporary, indent=2, sort_keys=True)
            temporary.write("\n")
            temporary.flush()
            os.fsync(temporary.fileno())
        os.replace(temporary_path, path)
        temporary_path = None
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


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
