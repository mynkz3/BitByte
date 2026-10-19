from __future__ import annotations

from typing import Any

from ..models import DatasetSplits
from ..normalize import canonicalize_known_terms, infer_modalities, make_record
from .base import SourceAdapter


class HuggingFaceAdapter(SourceAdapter):
    name = "huggingface"
    endpoint = "https://huggingface.co/api/datasets"

    def extract_records(self, payload: Any) -> list[dict[str, Any]]:
        if not isinstance(payload, list):
            raise ValueError("Hugging Face response must be a list")
        return payload

    def normalize(self, raw: dict[str, Any]):
        dataset_id = str(raw.get("id", "")).strip()
        if not dataset_id:
            raise ValueError("Hugging Face record is missing id")
        card_data = raw.get("cardData") or {}
        tags = [str(value) for value in raw.get("tags", [])]
        task_values = [str(value) for value in card_data.get("task_categories", [])]
        task_values.extend(tags)
        language_values = card_data.get("language", [])
        if isinstance(language_values, str):
            language_values = [language_values]
        title = str(card_data.get("pretty_name") or dataset_id)
        return make_record(
            source=self.name,
            source_id=dataset_id,
            title=title,
            summary=str(raw.get("description") or ""),
            canonical_url=f"https://huggingface.co/datasets/{dataset_id}",
            tags=tags,
            modalities=infer_modalities([*tags, *task_values]),
            tasks=canonicalize_known_terms(task_values, "tasks"),
            domains=canonicalize_known_terms(tags, "domains"),
            targets=[],
            languages=[str(value) for value in language_values],
            license_value=card_data.get("license"),
            source_updated_at=raw.get("lastModified"),
            splits=DatasetSplits(train=False, validation=False, test=False),
        )
