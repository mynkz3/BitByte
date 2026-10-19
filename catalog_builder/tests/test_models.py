import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from bitbyte_catalog.models import DatasetRecord, ResearchQuery


FIXTURE_DIR = Path(__file__).parent / "fixtures"


def read_fixture(name: str) -> dict:
    return json.loads((FIXTURE_DIR / name).read_text(encoding="utf-8"))


def test_dataset_model_accepts_canonical_fixture() -> None:
    record = DatasetRecord.model_validate(read_fixture("valid_dataset.json"))

    assert record.identity.source == "huggingface"
    assert record.fit.modalities == ["image"]


def test_query_model_accepts_confirmed_requirements() -> None:
    query = ResearchQuery.model_validate(read_fixture("valid_query.json"))

    assert query.requirements.tasks.must_have == ["classification"]
    assert query.priorities.text_relevance == 0.3


def test_dataset_model_rejects_unknown_top_level_field() -> None:
    payload = read_fixture("valid_dataset.json")
    payload["unexpected"] = True

    with pytest.raises(ValidationError):
        DatasetRecord.model_validate(payload)
