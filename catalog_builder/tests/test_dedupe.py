import json
from pathlib import Path

from bitbyte_catalog.dedupe import deduplicate_records
from bitbyte_catalog.models import DatasetRecord


FIXTURE = Path(__file__).parent / "fixtures" / "valid_dataset.json"


def test_duplicate_canonical_urls_merge_alternate_links() -> None:
    payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
    first = DatasetRecord.model_validate(payload)
    second_payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
    second_payload["identity"]["alternate_urls"] = [
        "https://example.org/alternate-dataset"
    ]
    second = DatasetRecord.model_validate(second_payload)

    records = deduplicate_records([first, second])

    assert len(records) == 1
    assert records[0].identity.alternate_urls == [
        "https://example.org/alternate-dataset"
    ]
