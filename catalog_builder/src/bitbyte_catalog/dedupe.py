from __future__ import annotations

from urllib.parse import urlsplit, urlunsplit

from .models import DatasetRecord


def deduplicate_records(records: list[DatasetRecord]) -> list[DatasetRecord]:
    by_url: dict[str, DatasetRecord] = {}
    order: list[str] = []

    for record in records:
        key = (
            f"identity:{record.identity.source}:{record.identity.id}"
            if record.identity.source == "curated"
            else normalize_url(record.identity.canonical_url)
        )
        if key not in by_url:
            by_url[key] = record
            order.append(key)
            continue
        by_url[key] = merge_records(by_url[key], record)

    return [by_url[key] for key in order]


def normalize_url(url: str) -> str:
    parsed = urlsplit(url.strip())
    path = parsed.path.rstrip("/") or "/"
    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), path, parsed.query, ""))


def merge_records(left: DatasetRecord, right: DatasetRecord) -> DatasetRecord:
    merged = left.model_copy(deep=True)
    alternate_urls = list(merged.identity.alternate_urls)
    for url in [right.identity.canonical_url, *right.identity.alternate_urls]:
        if url != merged.identity.canonical_url and url not in alternate_urls:
            alternate_urls.append(url)
    merged.identity.alternate_urls = alternate_urls

    if right.quality.metadata_completeness > merged.quality.metadata_completeness:
        merged.quality.metadata_completeness = right.quality.metadata_completeness
    merged.content.tags = list(dict.fromkeys([*merged.content.tags, *right.content.tags]))
    merged.identity.aliases = list(dict.fromkeys([*merged.identity.aliases, *right.identity.aliases]))
    merged.fit.modalities = list(dict.fromkeys([*merged.fit.modalities, *right.fit.modalities]))
    merged.fit.tasks = list(dict.fromkeys([*merged.fit.tasks, *right.fit.tasks]))
    merged.fit.domains = list(dict.fromkeys([*merged.fit.domains, *right.fit.domains]))
    merged.fit.subjects = list(dict.fromkeys([*merged.fit.subjects, *right.fit.subjects]))
    merged.fit.data_objects = list(dict.fromkeys([*merged.fit.data_objects, *right.fit.data_objects]))
    merged.fit.targets = list(dict.fromkeys([*merged.fit.targets, *right.fit.targets]))
    merged.evidence.update(right.evidence)
    return merged
