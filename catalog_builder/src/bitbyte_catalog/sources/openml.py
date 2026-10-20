from __future__ import annotations

from typing import Any

from ..normalize import infer_tasks, make_record
from .base import SourceAdapter


class OpenMLAdapter(SourceAdapter):
    name = "openml"
    endpoint = "https://www.openml.org/api/v1/json/data/list/data_name"

    def extract_records(self, payload: Any) -> list[dict[str, Any]]:
        data = payload.get("data") if isinstance(payload, dict) else None
        records = data.get("dataset") if isinstance(data, dict) else data
        if not isinstance(records, list):
            raise ValueError("OpenML response must contain a data.dataset list")
        return records

    def normalize(self, raw: dict[str, Any]):
        source_id = str(raw.get("did", "")).strip()
        if not source_id:
            raise ValueError("OpenML record is missing did")
        quality = {
            str(item.get("name")): item.get("value")
            for item in raw.get("quality", [])
            if isinstance(item, dict) and item.get("name")
        }
        description = str(raw.get("description") or "")
        task_values = infer_tasks(
            [raw.get("default_target_attribute", ""), raw.get("name", ""), description]
        )
        return make_record(
            source=self.name,
            source_id=source_id,
            title=str(raw.get("name") or source_id),
            summary=description,
            canonical_url=f"https://www.openml.org/d/{source_id}",
            tags=["tabular"],
            modalities=["tabular"],
            tasks=task_values,
            domains=[],
            targets=[str(raw["default_target_attribute"])]
            if raw.get("default_target_attribute")
            else [],
            languages=[],
            license_value=raw.get("licence") or raw.get("license"),
            records=_integer_or_none(
                raw.get("NumberOfInstances") or quality.get("NumberOfInstances")
            ),
            features=_integer_or_none(
                raw.get("NumberOfFeatures") or quality.get("NumberOfFeatures")
            ),
        )


def _integer_or_none(value: Any) -> int | None:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None
