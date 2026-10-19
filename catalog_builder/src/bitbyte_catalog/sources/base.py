from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import httpx

from ..models import DatasetRecord


class SourceAdapter(ABC):
    name: str
    endpoint: str

    def fetch_records(self, client: httpx.Client, limit: int = 100) -> list[DatasetRecord]:
        response = client.get(self.endpoint, params={"limit": limit})
        response.raise_for_status()
        payload = response.json()
        return [self.normalize(raw) for raw in self.extract_records(payload)]

    @abstractmethod
    def extract_records(self, payload: Any) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def normalize(self, raw: dict[str, Any]) -> DatasetRecord:
        raise NotImplementedError
