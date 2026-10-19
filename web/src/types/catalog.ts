export type EvidenceType =
  | "source_metadata"
  | "derived_metadata"
  | "verified_link"
  | "researcher_input"
  | "not_reported";

export interface Evidence {
  evidence_type: EvidenceType;
  evidence_text?: string | null;
  confidence: number;
}

export interface DatasetRecord {
  identity: {
    id: string;
    source: string;
    source_id: string;
    canonical_url: string;
    alternate_urls: string[];
  };
  content: {
    title: string;
    summary: string;
    search_text: string;
    tags: string[];
    citation: string;
  };
  fit: {
    modalities: string[];
    tasks: string[];
    domains: string[];
    targets: string[];
    languages: string[];
    geography: string[];
    time_range: {
      start: string | null;
      end: string | null;
    };
    annotation_types: string[];
    attributes: Record<string, unknown>;
  };
  practical: {
    size: {
      bytes: number | null;
      records: number | null;
      features: number | null;
    };
    splits: {
      train: boolean;
      validation: boolean;
      test: boolean;
    };
    license: {
      spdx_id: string | null;
      label: string | null;
      url: string | null;
      category: "permissive" | "copyleft" | "research_only" | "restricted" | "unknown";
    };
    access_type: "public" | "gated" | "restricted" | "unknown";
  };
  quality: {
    metadata_completeness: number;
    availability_status: "reachable" | "restricted" | "unavailable" | "unknown";
    warnings: string[];
    last_verified_at: string | null;
  };
  evidence: Record<string, Evidence>;
  provenance: {
    adapter_version: string;
    extracted_at: string;
    source_updated_at: string | null;
    schema_version: string;
  };
}

export interface CatalogManifest {
  catalog_version: string;
  schema_version: string;
  generated_at: string;
  source_versions: Record<string, string>;
  record_counts: Record<string, number>;
  stale_sources: string[];
  validation_summary: {
    valid: boolean;
    warnings: number;
    errors: number;
  };
}
