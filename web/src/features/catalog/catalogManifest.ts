import type { CatalogManifest } from "../../types/catalog";

export interface CatalogArtifact {
  catalog_version: string;
  schema_version: string;
  records: unknown[];
}

export function isCatalogManifest(value: unknown): value is CatalogManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<CatalogManifest>;
  return (
    typeof manifest.catalog_version === "string" &&
    typeof manifest.schema_version === "string" &&
    typeof manifest.generated_at === "string" &&
    typeof manifest.source_versions === "object" &&
    typeof manifest.record_counts === "object" &&
    Array.isArray(manifest.stale_sources) &&
    typeof manifest.validation_summary === "object"
  );
}

export function isCatalogArtifact(value: unknown): value is CatalogArtifact {
  if (!value || typeof value !== "object") return false;
  const artifact = value as Partial<CatalogArtifact>;
  return (
    typeof artifact.catalog_version === "string" &&
    typeof artifact.schema_version === "string" &&
    Array.isArray(artifact.records)
  );
}
