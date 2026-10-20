from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable

from .models import (
    DatasetContent,
    DatasetFit,
    DatasetIdentity,
    DatasetLicense,
    DatasetPractical,
    DatasetProvenance,
    DatasetQuality,
    DatasetRecord,
    DatasetSize,
    DatasetSplits,
    Evidence,
    TimeRange,
)


ROOT = Path(__file__).resolve().parents[3]


@lru_cache(maxsize=1)
def load_taxonomy() -> dict[str, Any]:
    return json.loads((ROOT / "schema" / "taxonomy.json").read_text(encoding="utf-8"))


def _normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def canonicalize_term(value: str, category: str) -> str:
    normalized = _normalized(value)
    taxonomy = load_taxonomy()
    canonical_values = taxonomy.get(category, [])
    if normalized in canonical_values:
        return normalized

    aliases = taxonomy.get("aliases", {}).get(category, {})
    for canonical, values in aliases.items():
        if normalized == _normalized(canonical) or any(
            normalized == _normalized(alias) for alias in values
        ):
            return canonical

    return normalized


def canonicalize_terms(values: Iterable[str], category: str) -> list[str]:
    result: list[str] = []
    for value in values:
        if not value:
            continue
        canonical = canonicalize_term(value, category)
        if canonical and canonical not in result:
            result.append(canonical)
    return result


def canonicalize_known_terms(values: Iterable[str], category: str) -> list[str]:
    known = set(load_taxonomy().get(category, []))
    return [term for term in canonicalize_terms(values, category) if term in known]


def infer_tasks(values: Iterable[str]) -> list[str]:
    text = " ".join(_normalized(value) for value in values if value).lower()
    markers = (
        ("classification", ("classif", "categor")),
        ("regression", ("regress", "continuous_prediction")),
        ("detection", ("detect", "localization")),
        ("segmentation", ("segment", "pixel_label")),
        ("forecasting", ("forecast", "future_prediction")),
        ("clustering", ("cluster", "grouping")),
        ("speech_recognition", ("speech", "voice", "automatic_speech")),
    )
    return [task for task, terms in markers if any(term in text for term in terms)]


def infer_modalities(values: Iterable[str], default: str | None = None) -> list[str]:
    found: list[str] = []
    for value in values:
        normalized = _normalized(value)
        for marker, modality in (
            ("image", "image"),
            ("visual", "image"),
            ("text", "text"),
            ("nlp", "text"),
            ("audio", "audio"),
            ("speech", "audio"),
            ("video", "video"),
            ("temporal", "time_series"),
            ("time_series", "time_series"),
            ("graph", "graph"),
            ("network", "graph"),
            ("multi", "multimodal"),
        ):
            if marker in normalized and modality not in found:
                found.append(modality)
    if not found and default:
        found.append(canonicalize_term(default, "modalities"))
    return found


def license_category(value: str | None) -> str:
    normalized = (value or "").lower()
    if any(marker in normalized for marker in ("mit", "apache", "bsd", "cc by", "public domain")):
        return "permissive"
    if any(marker in normalized for marker in ("gpl", "lgpl", "agpl", "copyleft")):
        return "copyleft"
    if any(marker in normalized for marker in ("research", "academic", "non-commercial")):
        return "research_only"
    if any(marker in normalized for marker in ("private", "restricted", "proprietary")):
        return "restricted"
    return "unknown"


def license_spdx(value: str | None) -> str | None:
    normalized = (value or "").lower()
    for marker, identifier in (
        ("mit", "MIT"),
        ("apache", "Apache-2.0"),
        ("bsd", "BSD"),
        ("gpl", "GPL"),
        ("cc by", "CC-BY"),
    ):
        if marker in normalized:
            return identifier
    return None


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def make_record(
    *,
    source: str,
    source_id: str,
    title: str,
    summary: str,
    canonical_url: str,
    tags: Iterable[str],
    modalities: Iterable[str],
    tasks: Iterable[str],
    domains: Iterable[str],
    targets: Iterable[str],
    languages: Iterable[str],
    license_value: str | None,
    records: int | None = None,
    features: int | None = None,
    bytes_size: int | None = None,
    source_updated_at: str | None = None,
    access_type: str = "public",
    splits: DatasetSplits | None = None,
    annotation_types: Iterable[str] = (),
    citation: str = "",
) -> DatasetRecord:
    normalized_tags = list(dict.fromkeys(_normalized(value) for value in tags if value))
    normalized_modalities = canonicalize_terms(modalities, "modalities")
    normalized_tasks = canonicalize_terms(tasks, "tasks")
    normalized_domains = canonicalize_terms(domains, "domains")
    normalized_languages = canonicalize_terms(languages, "languages")
    normalized_annotations = canonicalize_terms(annotation_types, "annotation_types")
    normalized_targets = list(dict.fromkeys(value.strip().lower() for value in targets if value))
    summary = summary.strip()
    title = title.strip() or source_id
    if not normalized_modalities:
        normalized_modalities = infer_modalities([title, summary, *normalized_tags])
    if not normalized_tasks:
        normalized_tasks = infer_tasks([*normalized_tags, title, summary])

    license_value = license_value.strip() if license_value else None
    license_data = DatasetLicense(
        spdx_id=license_spdx(license_value),
        label=license_value,
        url=None,
        category=license_category(license_value),
    )
    record_splits = splits or DatasetSplits(train=False, validation=False, test=False)
    search_text = " ".join(
        [
            title,
            summary,
            " ".join(normalized_tags),
            " ".join(normalized_modalities),
            " ".join(normalized_tasks),
            " ".join(normalized_domains),
            " ".join(normalized_targets),
        ]
    ).strip()
    known_fields = [
        normalized_modalities,
        normalized_tasks,
        normalized_domains,
        normalized_targets,
        normalized_languages,
        records,
        license_value,
    ]
    completeness = sum(value not in (None, [], "") for value in known_fields) / len(known_fields)
    extracted_at = now_utc()

    return DatasetRecord(
        identity=DatasetIdentity(
            id=f"{source}:{source_id}",
            source=source,
            source_id=source_id,
            canonical_url=canonical_url,
            alternate_urls=[],
            aliases=[],
        ),
        content=DatasetContent(
            title=title,
            summary=summary,
            search_text=search_text,
            tags=normalized_tags,
            citation=citation,
        ),
        fit=DatasetFit(
            modalities=normalized_modalities,
            tasks=normalized_tasks,
            domains=normalized_domains,
            subjects=[],
            data_objects=[],
            targets=normalized_targets,
            languages=normalized_languages,
            geography=[],
            time_range=TimeRange(start=None, end=None),
            annotation_types=normalized_annotations,
            attributes={},
        ),
        practical=DatasetPractical(
            size=DatasetSize(bytes=bytes_size, records=records, features=features),
            splits=record_splits,
            license=license_data,
            access_type=access_type,
        ),
        quality=DatasetQuality(
            metadata_completeness=round(completeness, 3),
            availability_status="unknown",
            warnings=[],
            last_verified_at=None,
        ),
        evidence={
            "identity.canonical_url": Evidence(
                evidence_type="source_metadata", evidence_text=canonical_url, confidence=1.0
            ),
            "fit.modalities": Evidence(
                evidence_type="source_metadata", evidence_text=" ".join(normalized_modalities) or None, confidence=0.8
            ),
        },
        provenance=DatasetProvenance(
            adapter_version=f"{source}-0.1.0",
            extracted_at=extracted_at,
            source_updated_at=parse_datetime(source_updated_at),
            schema_version="0.2.0",
        ),
    )
