import json
from pathlib import Path

import httpx

from bitbyte_catalog.link_verification import verify_record_link
from bitbyte_catalog.models import DatasetRecord


FIXTURE = Path(__file__).parent / "fixtures" / "valid_dataset.json"


def record() -> DatasetRecord:
    return DatasetRecord.model_validate(
        json.loads(FIXTURE.read_text(encoding="utf-8"))
    )


def test_reachable_link_updates_quality_and_evidence() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    updated = verify_record_link(record(), client)

    assert updated.quality.availability_status == "reachable"
    assert updated.quality.last_verified_at is not None
    assert updated.evidence["identity.canonical_url"].evidence_type == "verified_link"


def test_forbidden_link_is_marked_restricted() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(403)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    updated = verify_record_link(record(), client)

    assert updated.quality.availability_status == "restricted"
