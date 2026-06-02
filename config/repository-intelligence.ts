import repositoryIntelligenceJson from "@/config/generated/repository-intelligence.json";

export const repositoryIntelligence = repositoryIntelligenceJson;

export type RepositoryIntelligence = typeof repositoryIntelligenceJson;
export type RepositoryProject =
  RepositoryIntelligence["repositories"][keyof RepositoryIntelligence["repositories"]];
export type RepositoryMetric = RepositoryProject["metrics"][number];
export type RepositoryArtifact = RepositoryProject["artifacts"][number];
