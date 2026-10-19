from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DatasetIdentity(StrictModel):
    id: str = Field(min_length=1)
    source: str = Field(min_length=1)
    source_id: str = Field(min_length=1)
    canonical_url: str
    alternate_urls: list[str]


class DatasetContent(StrictModel):
    title: str = Field(min_length=1)
    summary: str
    search_text: str
    tags: list[str]
    citation: str


class TimeRange(StrictModel):
    start: str | None
    end: str | None


class DatasetFit(StrictModel):
    modalities: list[str]
    tasks: list[str]
    domains: list[str]
    targets: list[str]
    languages: list[str]
    geography: list[str]
    time_range: TimeRange
    annotation_types: list[str]
    attributes: dict[str, Any]


class DatasetSize(StrictModel):
    bytes: int | None = Field(default=None, ge=0)
    records: int | None = Field(default=None, ge=0)
    features: int | None = Field(default=None, ge=0)


class DatasetSplits(StrictModel):
    train: bool
    validation: bool
    test: bool


class DatasetLicense(StrictModel):
    spdx_id: str | None
    label: str | None
    url: str | None
    category: Literal[
        "permissive",
        "copyleft",
        "research_only",
        "restricted",
        "unknown",
    ]


class DatasetPractical(StrictModel):
    size: DatasetSize
    splits: DatasetSplits
    license: DatasetLicense
    access_type: Literal["public", "gated", "restricted", "unknown"]


class DatasetQuality(StrictModel):
    metadata_completeness: float = Field(ge=0, le=1)
    availability_status: Literal["reachable", "restricted", "unavailable", "unknown"]
    warnings: list[str]
    last_verified_at: datetime | None


class Evidence(StrictModel):
    evidence_type: Literal[
        "source_metadata",
        "derived_metadata",
        "verified_link",
        "researcher_input",
        "not_reported",
    ]
    evidence_text: str | None = None
    confidence: float = Field(ge=0, le=1)


class DatasetProvenance(StrictModel):
    adapter_version: str = Field(min_length=1)
    extracted_at: datetime
    source_updated_at: datetime | None
    schema_version: str = Field(min_length=1)


class DatasetRecord(StrictModel):
    identity: DatasetIdentity
    content: DatasetContent
    fit: DatasetFit
    practical: DatasetPractical
    quality: DatasetQuality
    evidence: dict[str, Evidence]
    provenance: DatasetProvenance


class MatchGroup(StrictModel):
    must_have: list[str]
    preferred: list[str]
    excluded: list[str]


class QueryRequirements(StrictModel):
    modalities: MatchGroup
    tasks: MatchGroup
    domains: MatchGroup
    targets: MatchGroup
    languages: MatchGroup
    licenses: MatchGroup
    required_splits: list[Literal["train", "validation", "test"]]
    min_records: int | None = Field(default=None, ge=0)
    max_records: int | None = Field(default=None, ge=0)
    only_verified: bool


class QueryPriorities(StrictModel):
    text_relevance: float = Field(ge=0, le=1)
    task_compatibility: float = Field(ge=0, le=1)
    modality_compatibility: float = Field(ge=0, le=1)
    domain_target_match: float = Field(ge=0, le=1)
    constraint_satisfaction: float = Field(ge=0, le=1)
    evaluation_readiness: float = Field(ge=0, le=1)
    quality_practical_fit: float = Field(ge=0, le=1)


class ResearchQuery(StrictModel):
    source_text: str
    requirements: QueryRequirements
    priorities: QueryPriorities
