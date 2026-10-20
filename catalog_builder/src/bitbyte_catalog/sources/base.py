from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import httpx

from ..models import DatasetRecord


class SourceAdapter(ABC):
    name: str
    endpoint: str

    def fetch_records(self, client: httpx.Client, limit: int = 100) -> list[DatasetRecord]:
        if limit <= 0:
            raise ValueError("limit must be positive")
        response = client.get(self.endpoint, params=self.request_params(limit))
        response.raise_for_status()
        payload = response.json()
        raw_records = self.extract_records(payload)
        return [self.normalize(raw) for raw in raw_records[:limit]]

    def request_params(self, limit: int) -> dict[str, Any]:
        return {"limit": limit}

    @abstractmethod
    def extract_records(self, payload: Any) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def normalize(self, raw: dict[str, Any]) -> DatasetRecord:
        raise NotImplementedError
