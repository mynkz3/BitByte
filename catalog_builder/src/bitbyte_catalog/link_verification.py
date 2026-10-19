from __future__ import annotations

from datetime import datetime, timezone

import httpx

from .models import DatasetRecord, Evidence


def verify_record_link(record: DatasetRecord, client: httpx.Client) -> DatasetRecord:
    checked_at = datetime.now(timezone.utc).replace(microsecond=0)
    try:
        response = client.head(record.identity.canonical_url)
        if response.status_code == 405:
            response = client.get(record.identity.canonical_url)
        status = classify_status(response.status_code)
    except httpx.HTTPError:
        status = "unknown"

    updated = record.model_copy(deep=True)
    updated.quality.availability_status = status
    updated.quality.last_verified_at = checked_at
    updated.evidence["identity.canonical_url"] = Evidence(
        evidence_type="verified_link",
        evidence_text=status,
        confidence=1.0 if status != "unknown" else 0.0,
    )
    return updated


def classify_status(status_code: int) -> str:
    if 200 <= status_code < 400:
        return "reachable"
    if status_code in {401, 403, 429}:
        return "restricted"
    if status_code == 404 or status_code >= 500:
        return "unavailable"
    return "unknown"
