import json
from pathlib import Path

from bitbyte_catalog.build import build_catalog
from bitbyte_catalog.models import DatasetRecord
from bitbyte_catalog.registry import load_registry_records


FIXTURE = Path(__file__).parent / "fixtures" / "valid_dataset.json"


def test_build_catalog_writes_valid_runtime_artifacts(tmp_path: Path) -> None:
    record = DatasetRecord.model_validate(
        json.loads(FIXTURE.read_text(encoding="utf-8"))
    )

    report = build_catalog(
        [record],
        output_dir=tmp_path,
        catalog_version="test-catalog",
        source_versions={"huggingface": "fixture"},
    )

    manifest = json.loads((tmp_path / "manifest.json").read_text(encoding="utf-8"))
    artifact = json.loads((tmp_path / "index-input.json").read_text(encoding="utf-8"))

    assert report["record_count"] == 1
    assert manifest["catalog_version"] == "test-catalog"
    assert artifact["records"][0]["identity"]["id"] == record.identity.id
    assert (tmp_path / "records.json").exists()
    assert (tmp_path / "source-status.json").exists()


def test_build_report_counts_registry_and_publishes_named_records(tmp_path: Path) -> None:
    record = DatasetRecord.model_validate(
        json.loads(FIXTURE.read_text(encoding="utf-8"))
    )

    report = build_catalog(
        [record],
        output_dir=tmp_path,
        catalog_version="registry-test",
        source_versions={"huggingface": "fixture"},
        registry_records=load_registry_records(
            Path(__file__).parent / "fixtures" / "chemistry_registry.json"
        ),
    )

    artifact = json.loads((tmp_path / "index-input.json").read_text(encoding="utf-8"))
    assert report["registry_count"] == 3
    assert report["record_count"] >= report["registry_count"]
    assert any(record["identity"]["id"] == "curated:ESOL" for record in artifact["records"])
