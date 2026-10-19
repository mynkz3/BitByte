import type { QueryPriorities } from "../../types/query";

const PRIORITIES_KEY = "bitbyte.preferences.priorities.v1";
const RECENT_QUERIES_KEY = "bitbyte.preferences.recent-queries.v1";
const MAX_RECENT_QUERIES = 5;

export function loadPriorities(fallback: QueryPriorities): QueryPriorities {
  if (typeof window === "undefined") return fallback;
  const serialized = window.localStorage.getItem(PRIORITIES_KEY);
  if (!serialized) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(serialized) as Partial<QueryPriorities>) };
  } catch {
    return fallback;
  }
}

export function savePriorities(priorities: QueryPriorities): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRIORITIES_KEY, JSON.stringify(priorities));
}

export function loadRecentQueries(): string[] {
  if (typeof window === "undefined") return [];
  const serialized = window.localStorage.getItem(RECENT_QUERIES_KEY);
  if (!serialized) return [];
  try {
    const parsed: unknown = JSON.parse(serialized);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function saveRecentQuery(query: string): void {
  if (typeof window === "undefined") return;
  const normalized = query.trim();
  if (!normalized) return;
  const recent = [normalized, ...loadRecentQueries().filter((item) => item !== normalized)].slice(
    0,
    MAX_RECENT_QUERIES,
  );
  window.localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(recent));
}
