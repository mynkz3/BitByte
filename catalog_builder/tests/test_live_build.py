import json
from pathlib import Path

import httpx
import pytest

from bitbyte_catalog.build import CatalogBuildError, build_live_catalog
from bitbyte_catalog.models import DatasetRecord


FIXTURE = Path(__file__).parent / "fixtures" / "valid_dataset.json"


def fixture_record() -> DatasetRecord:
    return DatasetRecord.model_validate(
        json.loads(FIXTURE.read_text(encoding="utf-8"))
    )


class SuccessfulAdapter:
    name = "fixture"

    def fetch_records(self, client: httpx.Client, limit: int) -> list[DatasetRecord]:
        assert limit == 10
        return [fixture_record()]


class FailingAdapter:
    name = "fixture"

    def fetch_records(self, client: httpx.Client, limit: int) -> list[DatasetRecord]:
        raise httpx.ConnectError("fixture source unavailable")


class EmptyAdapter:
    name = "fixture"

    def fetch_records(self, client: httpx.Client, limit: int) -> list[DatasetRecord]:
        return []


class OversizedAdapter:
    name = "fixture"

    def fetch_records(self, client: httpx.Client, limit: int) -> list[DatasetRecord]:
        return [fixture_record(), fixture_record()]


def test_live_build_writes_source_snapshot_and_catalog(tmp_path: Path) -> None:
    report = build_live_catalog(
        [SuccessfulAdapter()],
        output_dir=tmp_path / "catalog",
        source_cache_dir=tmp_path / "source-cache",
        catalog_version="live-test",
        source_limit=10,
        verify_links=False,
    )

    assert report["record_count"] == 1
    assert (tmp_path / "source-cache" / "fixture.json").exists()
    manifest = json.loads(
        (tmp_path / "catalog" / "manifest.json").read_text(encoding="utf-8")
    )
    assert manifest["stale_sources"] == []


def test_live_build_uses_cached_source_when_refresh_fails(tmp_path: Path) -> None:
    cache_dir = tmp_path / "source-cache"
    build_live_catalog(
        [SuccessfulAdapter()],
        output_dir=tmp_path / "first-catalog",
        source_cache_dir=cache_dir,
        catalog_version="first",
        source_limit=10,
        verify_links=False,
    )

    report = build_live_catalog(
        [FailingAdapter()],
        output_dir=tmp_path / "second-catalog",
        source_cache_dir=cache_dir,
        catalog_version="second",
        source_limit=10,
        verify_links=False,
    )

    assert report["record_count"] == 1
    manifest = json.loads(
        (tmp_path / "second-catalog" / "manifest.json").read_text(encoding="utf-8")
    )
    assert manifest["stale_sources"] == ["fixture"]


def test_live_build_fails_when_source_has_no_cache(tmp_path: Path) -> None:
    with pytest.raises(CatalogBuildError, match="fixture"):
        build_live_catalog(
            [FailingAdapter()],
            output_dir=tmp_path / "catalog",
            source_cache_dir=tmp_path / "source-cache",
            catalog_version="live-test",
            source_limit=10,
            verify_links=False,
        )


def test_live_build_rejects_non_positive_source_limit(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="source_limit"):
        build_live_catalog(
            [SuccessfulAdapter()],
            output_dir=tmp_path / "catalog",
            source_cache_dir=tmp_path / "source-cache",
            catalog_version="live-test",
            source_limit=0,
            verify_links=False,
        )


def test_live_build_caps_adapter_output_to_source_limit(tmp_path: Path) -> None:
    report = build_live_catalog(
        [OversizedAdapter()],
        output_dir=tmp_path / "catalog",
        source_cache_dir=tmp_path / "source-cache",
        catalog_version="live-test",
        source_limit=1,
        verify_links=False,
    )

    assert report["record_count"] == 1


def test_live_build_uses_cache_when_source_returns_no_records(tmp_path: Path) -> None:
    cache_dir = tmp_path / "source-cache"
    build_live_catalog(
        [SuccessfulAdapter()],
        output_dir=tmp_path / "first-catalog",
        source_cache_dir=cache_dir,
        catalog_version="first",
        source_limit=10,
        verify_links=False,
    )

    report = build_live_catalog(
        [EmptyAdapter()],
        output_dir=tmp_path / "second-catalog",
        source_cache_dir=cache_dir,
        catalog_version="second",
        source_limit=10,
        verify_links=False,
    )

    assert report["record_count"] == 1
    manifest = json.loads(
        (tmp_path / "second-catalog" / "manifest.json").read_text(encoding="utf-8")
    )
    assert manifest["stale_sources"] == ["fixture"]
