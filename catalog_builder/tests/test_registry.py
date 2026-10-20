import json
from pathlib import Path

from bitbyte_catalog.registry import load_registry_entries, load_registry_records
from bitbyte_catalog.sources.huggingface import HuggingFaceAdapter


FIXTURE = Path(__file__).parent / "fixtures" / "chemistry_registry.json"


def test_registry_entries_validate_and_materialize_named_chemistry_records() -> None:
    entries = load_registry_entries(FIXTURE)
    records = load_registry_records(FIXTURE)

    assert len(entries) == 3
    assert {record.content.title for record in records} == {"ESOL", "BACE", "Lipophilicity"}
    esol = next(record for record in records if record.content.title == "ESOL")
    assert "Delaney solubility" in esol.identity.aliases
    assert esol.fit.data_objects == ["molecule", "molecular_graph"]
    assert esol.identity.id == "curated:ESOL"


def test_source_identity_is_indexable_as_an_alias() -> None:
    raw = {"id": "mynkz3/ESOL", "tags": []}
    record = HuggingFaceAdapter().normalize(raw)

    assert "mynkz3/ESOL" in record.identity.aliases
    assert "mynkz3/ESOL" in record.content.search_text


def test_registry_fixture_matches_registry_schema() -> None:
    assert isinstance(json.loads(FIXTURE.read_text(encoding="utf-8")), list)
