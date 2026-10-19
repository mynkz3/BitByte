import type { CatalogManifest } from "../../types/catalog";
import type { CatalogArtifact } from "../../features/catalog/catalogManifest";

const STORAGE_KEY = "bitbyte.catalog.v1";

export interface CachedCatalog {
  manifest: CatalogManifest;
  artifact: CatalogArtifact;
}

export interface CatalogCache {
  read: () => Promise<CachedCatalog | null>;
  write: (catalog: CachedCatalog) => Promise<void>;
}

export const browserCatalogCache: CatalogCache = {
  async read() {
    if (typeof window === "undefined") return null;
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;
    try {
      return JSON.parse(serialized) as CachedCatalog;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },
  async write(catalog) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  },
};
