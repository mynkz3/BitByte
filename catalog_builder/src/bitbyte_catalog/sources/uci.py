from __future__ import annotations

from typing import Any

from ..normalize import canonicalize_known_terms, make_record
from .base import SourceAdapter


class UciAdapter(SourceAdapter):
    name = "uci"
    endpoint = "https://archive.ics.uci.edu/api/datasets"

    def extract_records(self, payload: Any) -> list[dict[str, Any]]:
        if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
            raise ValueError("UCI response must contain a data list")
        return payload["data"]

    def normalize(self, raw: dict[str, Any]):
        source_id = str(raw.get("id", "")).strip()
        if not source_id:
            raise ValueError("UCI record is missing id")
        task_values = canonicalize_known_terms(raw.get("tasks", []), "tasks")
        return make_record(
            source=self.name,
            source_id=source_id,
            title=str(raw.get("name") or source_id),
            summary=str(raw.get("description") or ""),
            canonical_url=str(
                raw.get("url") or f"https://archive.ics.uci.edu/dataset/{source_id}"
            ),
            tags=["tabular"],
            modalities=["tabular"],
            tasks=task_values,
            domains=[],
            targets=[],
            languages=[],
            license_value=raw.get("license"),
            records=_integer_or_none(raw.get("num_instances")),
            features=_integer_or_none(raw.get("num_features")),
        )


def _integer_or_none(value: Any) -> int | None:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None
