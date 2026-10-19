export type CatalogStatusValue = "loading" | "ready" | "error" | "unavailable";

interface CatalogStatusProps {
  status: CatalogStatusValue;
  version?: string | null;
  message?: string | null;
}

export function CatalogStatus({ status, version = null, message = null }: CatalogStatusProps) {
  const labels: Record<CatalogStatusValue, string> = {
    loading: "Loading the dataset catalog...",
    ready: version ? `Catalog ${version} is ready` : "Dataset catalog is ready",
    error: "The dataset catalog could not be loaded",
    unavailable: "The dataset catalog is unavailable",
  };

  return (
    <div className={`catalog-status catalog-status-${status}`} role="status">
      <span className="status-dot" aria-hidden="true" />
      <span>{message ?? labels[status]}</span>
    </div>
  );
}
