import type { CatalogManifest } from "../../types/catalog";
import {
  isCatalogArtifact,
  isCatalogManifest,
  type CatalogArtifact,
} from "./catalogManifest";
import {
  browserCatalogCache,
  type CachedCatalog,
  type CatalogCache,
} from "../../lib/storage/catalogCache";

export interface LoadedCatalog {
  manifest: CatalogManifest;
  artifact: CatalogArtifact;
  source: "network" | "cache";
  warning?: string;
}

interface CatalogLoaderOptions {
  basePath?: string;
  fetcher?: typeof fetch;
  cache?: CatalogCache;
}

export async function loadCatalog(options: CatalogLoaderOptions = {}): Promise<LoadedCatalog> {
  const basePath = trimTrailingSlash(options.basePath ?? import.meta.env.BASE_URL ?? "/");
  const fetcher = options.fetcher ?? fetch;
  const cache = options.cache ?? browserCatalogCache;
  const cached = await cache.read();

  try {
    const manifest = await fetchJson(`${basePath}/catalog/manifest.json`, fetcher);
    if (!isCatalogManifest(manifest)) {
      throw new Error("catalog manifest has an invalid shape");
    }

    if (cached?.manifest.catalog_version === manifest.catalog_version) {
      return { manifest, artifact: cached.artifact, source: "cache" };
    }

    const artifactPath = `${basePath}/catalog/${manifest.catalog_version}/index.json`;
    const artifact = await fetchJson(artifactPath, fetcher);
    if (!isCatalogArtifact(artifact)) {
      throw new Error("catalog artifact has an invalid shape");
    }
    if (artifact.catalog_version !== manifest.catalog_version) {
      throw new Error("catalog artifact version does not match its manifest");
    }

    const fresh: CachedCatalog = { manifest, artifact };
    await cache.write(fresh);
    return { manifest, artifact, source: "network" };
  } catch (error) {
    if (cached) {
      return {
        manifest: cached.manifest,
        artifact: cached.artifact,
        source: "cache",
        warning: error instanceof Error ? error.message : "catalog refresh failed",
      };
    }
    throw error instanceof Error ? error : new Error("catalog could not be loaded");
  }
}

async function fetchJson(url: string, fetcher: typeof fetch): Promise<unknown> {
  const response = await fetcher(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`catalog request failed with HTTP ${response.status}`);
  }
  return response.json();
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}
