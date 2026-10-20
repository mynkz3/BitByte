import { describe, expect, it, vi } from "vitest";
import { loadCatalog } from "./catalogLoader";
import type { CatalogCache, CachedCatalog } from "../../lib/storage/catalogCache";

const manifest = {
  catalog_version: "catalog-1",
  schema_version: "0.2.0",
  generated_at: "2026-10-19T00:00:00Z",
  source_versions: { fixture: "1" },
  record_counts: { total: 1 },
  stale_sources: [],
  validation_summary: { valid: true, warnings: 0, errors: 0 },
};

const artifact = {
  catalog_version: "catalog-1",
  schema_version: "0.2.0",
  records: [],
};

function cache(initial: CachedCatalog | null = null): CatalogCache & { value: CachedCatalog | null } {
  return {
    value: initial,
    async read() {
      return this.value;
    },
    async write(value) {
      this.value = value;
    },
  };
}

function response(value: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 503,
    json: async () => value,
  } as Response;
}

describe("loadCatalog", () => {
  it("loads and caches a new catalog version", async () => {
    const requests: string[] = [];
    const fetcher = vi.fn(async (url: string) => {
      requests.push(url);
      return response(url.endsWith("manifest.json") ? manifest : artifact);
    }) as typeof fetch;
    const catalogCache = cache();

    const loaded = await loadCatalog({ basePath: "/BitByte", fetcher, cache: catalogCache });

    expect(loaded.source).toBe("network");
    expect(requests).toEqual(["/BitByte/catalog/manifest.json", "/BitByte/catalog/catalog-1/index.json"]);
    expect(catalogCache.value?.manifest.catalog_version).toBe("catalog-1");
  });

  it("uses the cached catalog when the published version is unchanged", async () => {
    const catalogCache = cache({ manifest, artifact });
    const fetcher = vi.fn(async () => response(manifest)) as typeof fetch;

    const loaded = await loadCatalog({ fetcher, cache: catalogCache });

    expect(loaded.source).toBe("cache");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("falls back to a cached catalog when refresh fails", async () => {
    const catalogCache = cache({ manifest, artifact });
    const fetcher = vi.fn(async () => response(null, false)) as typeof fetch;

    const loaded = await loadCatalog({ fetcher, cache: catalogCache });

    expect(loaded.source).toBe("cache");
    expect(loaded.warning).toContain("HTTP 503");
  });
});
