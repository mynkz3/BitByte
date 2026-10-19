from __future__ import annotations

import argparse
import json
from pathlib import Path

from .build import build_catalog
from .models import DatasetRecord


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m bitbyte_catalog")
    subparsers = parser.add_subparsers(dest="command", required=True)
    build_parser = subparsers.add_parser("build")
    build_parser.add_argument("--fixtures", type=Path, required=True)
    build_parser.add_argument("--output", type=Path, required=True)
    build_parser.add_argument("--catalog-version", default="fixture-catalog")
    args = parser.parse_args()

    if args.command == "build":
        records = load_fixture_records(args.fixtures)
        report = build_catalog(
            records,
            output_dir=args.output,
            catalog_version=args.catalog_version,
            source_versions={record.identity.source: "fixture" for record in records},
        )
        print(json.dumps(report, indent=2))


def load_fixture_records(directory: Path) -> list[DatasetRecord]:
    records: list[DatasetRecord] = []
    for path in sorted(directory.glob("*.json")):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            records.append(DatasetRecord.model_validate(payload))
        except (OSError, json.JSONDecodeError, ValueError):
            continue
    if not records:
        raise SystemExit(f"no dataset fixtures found in {directory}")
    return records


if __name__ == "__main__":
    main()
