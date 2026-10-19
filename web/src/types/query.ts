export interface MatchGroup {
  must_have: string[];
  preferred: string[];
  excluded: string[];
}

export interface QueryRequirements {
  modalities: MatchGroup;
  tasks: MatchGroup;
  domains: MatchGroup;
  targets: MatchGroup;
  languages: MatchGroup;
  licenses: MatchGroup;
  required_splits: Array<"train" | "validation" | "test">;
  min_records: number | null;
  max_records: number | null;
  only_verified: boolean;
}

export interface QueryPriorities {
  text_relevance: number;
  task_compatibility: number;
  modality_compatibility: number;
  domain_target_match: number;
  constraint_satisfaction: number;
  evaluation_readiness: number;
  quality_practical_fit: number;
}

export interface ResearchQuery {
  source_text: string;
  requirements: QueryRequirements;
  priorities: QueryPriorities;
}
