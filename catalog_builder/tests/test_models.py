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


def test_dataset_contract_accepts_aliases_and_research_fit() -> None:
    payload = read_fixture("valid_dataset.json")
    payload["identity"]["aliases"] = ["ESOL", "Delaney solubility"]
    payload["fit"]["subjects"] = ["chemistry"]
    payload["fit"]["data_objects"] = ["molecule", "molecular_graph"]

    record = DatasetRecord.model_validate(payload)

    assert record.identity.aliases == ["ESOL", "Delaney solubility"]
    assert record.fit.data_objects == ["molecule", "molecular_graph"]


def test_query_contract_preserves_named_dataset_roles_and_context() -> None:
    payload = read_fixture("valid_query.json")
    payload["requirements"]["named_datasets"] = [
        {"name": "ESOL", "role": "anchor"}
    ]
    payload["requirements"]["subjects"] = {
        "must_have": ["chemistry"],
        "preferred": [],
        "excluded": [],
    }
    payload["requirements"]["data_objects"] = {
        "must_have": ["molecular_graph"],
        "preferred": [],
        "excluded": [],
    }
    payload["context"] = {
        "goals": ["training"],
        "frameworks": ["gnn"],
        "models": [],
        "metrics": ["mae", "rmse"],
    }

    query = ResearchQuery.model_validate(payload)

    assert query.requirements.named_datasets[0].role == "anchor"
    assert query.context.frameworks == ["gnn"]


def test_query_model_rejects_unknown_named_dataset_role() -> None:
    payload = read_fixture("valid_query.json")
    payload["requirements"]["named_datasets"] = [
        {"name": "ESOL", "role": "unrelated"}
    ]
    payload["requirements"]["subjects"] = {
        "must_have": [],
        "preferred": [],
        "excluded": [],
    }
    payload["requirements"]["data_objects"] = {
        "must_have": [],
        "preferred": [],
        "excluded": [],
    }
    payload["context"] = {
        "goals": [],
        "frameworks": [],
        "models": [],
        "metrics": [],
    }

    with pytest.raises(ValidationError):
        ResearchQuery.model_validate(payload)
