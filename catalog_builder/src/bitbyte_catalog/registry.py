from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable

from jsonschema import validate

from .models import DatasetRecord, Evidence
from .normalize import make_record


ROOT = Path(__file__).resolve().parents[3]
REGISTRY_SCHEMA = ROOT / "schema" / "dataset-registry.schema.json"
DEFAULT_REGISTRY = Path(__file__).with_name("registry") / "datasets.json"


def load_registry_entries(path: Path | str = DEFAULT_REGISTRY) -> list[dict[str, Any]]:
    registry_path = Path(path)
    try:
        payload = json.loads(registry_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"could not read dataset registry {registry_path}: {error}") from error
    schema = json.loads(REGISTRY_SCHEMA.read_text(encoding="utf-8"))
    validate(payload, schema)
    if not isinstance(payload, list):
        raise ValueError("dataset registry must be a list")
    return payload


def load_registry_records(path: Path | str = DEFAULT_REGISTRY) -> list[DatasetRecord]:
    return materialize_registry_records(load_registry_entries(path))


def materialize_registry_records(entries: Iterable[dict[str, Any]]) -> list[DatasetRecord]:
    records: list[DatasetRecord] = []
    for entry in entries:
        source_urls = list(entry["source_urls"])
        source_ids = list(entry["source_ids"])
        canonical_name = entry["canonical_name"]
        aliases = [*entry.get("aliases", []), *source_ids]
        notes = entry.get("notes", "")
        record = make_record(
            source="curated",
            source_id=canonical_name,
            title=canonical_name,
            summary=notes,
            canonical_url=source_urls[0],
            alternate_urls=source_urls[1:],
            aliases=aliases,
            tags=[entry["source"], entry["evidence_level"]],
            modalities=entry["modalities"],
            tasks=entry["tasks"],
            domains=entry["subjects"],
            subjects=entry["subjects"],
            data_objects=entry["data_objects"],
            targets=entry["targets"],
            languages=[],
            license_value=None,
            access_type="public",
            citation="; ".join(entry.get("citation_identifiers", [])),
        )
        record.provenance.adapter_version = "curated-registry-0.1.0"
        record.quality.availability_status = "unknown"
        record.quality.warnings = ["curated identity; source availability not asserted"]
        record.evidence.update(
            {
                "registry.identity": Evidence(
                    evidence_type="source_metadata",
                    evidence_text=canonical_name,
                    confidence=1.0,
                ),
                "registry.source_urls": Evidence(
                    evidence_type="source_metadata",
                    evidence_text="; ".join(source_urls),
                    confidence=0.95,
                ),
                "registry.evidence_level": Evidence(
                    evidence_type="derived_metadata",
                    evidence_text=entry["evidence_level"],
                    confidence=0.9,
                ),
            }
        )
        records.append(record)
    return records
