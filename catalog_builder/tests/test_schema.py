import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator


ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = ROOT / "schema"
FIXTURE_DIR = Path(__file__).parent / "fixtures"


def read_json(path: Path) -> dict | list:
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    "schema_name",
    [
        "dataset.schema.json",
        "query.schema.json",
        "dataset-registry.schema.json",
        "catalog-manifest.schema.json",
    ],
)
def test_schema_is_valid_json_schema(schema_name: str) -> None:
    schema = read_json(SCHEMA_DIR / schema_name)

    Draft202012Validator.check_schema(schema)


@pytest.mark.parametrize(
    ("schema_name", "fixture_name"),
    [
        ("dataset.schema.json", "valid_dataset.json"),
        ("query.schema.json", "valid_query.json"),
        ("dataset-registry.schema.json", "chemistry_registry.json"),
        ("catalog-manifest.schema.json", "valid_manifest.json"),
    ],
)
def test_fixture_matches_schema(schema_name: str, fixture_name: str) -> None:
    schema = read_json(SCHEMA_DIR / schema_name)
    fixture = read_json(FIXTURE_DIR / fixture_name)

    errors = sorted(Draft202012Validator(schema).iter_errors(fixture), key=str)

    assert errors == []


def test_taxonomy_covers_supported_dataset_modalities() -> None:
    taxonomy = read_json(SCHEMA_DIR / "taxonomy.json")

    assert set(taxonomy["modalities"]) >= {
        "tabular",
        "text",
        "image",
        "audio",
        "video",
        "time_series",
        "graph",
        "multimodal",
    }


def test_taxonomy_covers_research_subjects_and_data_objects() -> None:
    taxonomy = read_json(SCHEMA_DIR / "taxonomy.json")

    assert set(taxonomy["subjects"]) >= {
        "chemistry",
        "molecular_property_prediction",
        "animals",
        "cats",
    }
    assert set(taxonomy["data_objects"]) >= {"molecule", "molecular_graph"}
