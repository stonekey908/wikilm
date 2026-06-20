// Shared response types for the Aurora views. These mirror the existing
// /api/* route shapes; fields are kept optional/defensive where the server
// shape is loose so the UI degrades gracefully.

export interface DashboardStats {
  sources: number;
  wikiPages: number;
  entities: number;
  concepts: number;
}

export interface JobRow {
  id: number;
  type: string;
  title: string;
  status: string; // queued | running | done | error | cancelled
  progress: string | null;
  model: string | null;
  createdAt: string;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recentActivity?: Array<{ date: string; operation: string; title: string; details: string }>;
  activeJobs?: JobRow[];
  recentJobs?: JobRow[];
}

export interface WikiPageMeta {
  title: string;
  type: string;
  tags: string[];
  slug: string;
  filePath?: string;
  updatedAt?: string;
}

export interface Backlink {
  slug: string;
  title: string;
  projectId?: number;
  projectSlug?: string;
}

export interface WikiPageFull {
  slug: string;
  title: string;
  type: string;
  tags?: string[];
  body: string;
  backlinks?: Backlink[];
  updatedAt?: string;
}

export interface SourceRow {
  id: number;
  type?: string;
  url?: string | null;
  title: string;
  summary?: string | null;
  tags?: string[] | string | null;
  status?: string | null;
  createdAt?: string;
}

export interface ResearchResult {
  title: string;
  url?: string;
  domain?: string;
  author?: string;
  type?: string;
  summary?: string;
  relevance?: number;
  tags?: string[];
}
