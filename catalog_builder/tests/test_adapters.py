import json
from pathlib import Path

import httpx

from bitbyte_catalog.sources.huggingface import HuggingFaceAdapter
from bitbyte_catalog.sources.openml import OpenMLAdapter
from bitbyte_catalog.sources.uci import UciAdapter


FIXTURE_DIR = Path(__file__).parent / "fixtures"


def read_fixture(name: str) -> dict | list:
    return json.loads((FIXTURE_DIR / name).read_text(encoding="utf-8"))


def test_huggingface_adapter_normalizes_metadata() -> None:
    record = HuggingFaceAdapter().normalize(read_fixture("huggingface_response.json")[0])

    assert record.identity.source == "huggingface"
    assert record.identity.source_id == "bitbyte/demo-image"
    assert record.content.title == "Demo Retinal Images"
    assert record.fit.modalities == ["image"]
    assert record.fit.tasks == ["classification"]
    assert record.practical.license.category == "permissive"


def test_openml_adapter_normalizes_structured_metadata() -> None:
    raw = read_fixture("openml_response.json")["data"]["dataset"][0]
    record = OpenMLAdapter().normalize(raw)

    assert record.identity.source == "openml"
    assert record.identity.source_id == "1"
    assert record.fit.modalities == ["tabular"]
    assert record.fit.tasks == ["classification"]
    assert record.practical.size.records == 150


def test_uci_adapter_normalizes_source_url_and_license() -> None:
    raw = read_fixture("uci_response.json")["data"][0]
    record = UciAdapter().normalize(raw)

    assert record.identity.source == "uci"
    assert record.identity.canonical_url.endswith("/demo")
    assert record.practical.license.category == "permissive"


def test_huggingface_fetch_uses_mocked_http() -> None:
    payload = read_fixture("huggingface_response.json")

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/datasets"
        assert request.url.params["limit"] == "10"
        return httpx.Response(200, json=payload)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    records = HuggingFaceAdapter().fetch_records(client, limit=10)

    assert len(records) == 1
    assert records[0].identity.id == "huggingface:bitbyte/demo-image"


def test_openml_fetch_reads_nested_dataset_list_and_caps_limit() -> None:
    payload = read_fixture("openml_response.json")

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v1/json/data/list/data_name"
        assert request.url.params["limit"] == "1"
        return httpx.Response(200, json=payload)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    records = OpenMLAdapter().fetch_records(client, limit=1)

    assert len(records) == 1
    assert records[0].identity.id == "openml:1"


def test_uci_fetch_uses_current_list_endpoint_and_caps_limit() -> None:
    payload = read_fixture("uci_response.json")
    payload["data"].append({**payload["data"][0], "id": 2})

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/datasets/list"
        assert request.url.params["filter"] == "python"
        return httpx.Response(200, json=payload)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    records = UciAdapter().fetch_records(client, limit=1)

    assert len(records) == 1
    assert records[0].identity.id == "uci:1"
