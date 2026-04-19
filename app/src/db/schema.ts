import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  color: text("color").notNull().default("#0d9488"),
  sourceCount: integer("source_count").notNull().default(0),
  pageCount: integer("page_count").notNull().default(0),
  parentId: integer("parent_id").references((): AnySQLiteColumn => projects.id),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const sources = sqliteTable("sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  title: text("title").notNull(),
  type: text("type").notNull(), // pdf, web, note
  filePath: text("file_path").notNull(),
  author: text("author"),
  meta: text("meta"),
  status: text("status").notNull().default("pending"), // pending, ingesting, ingested, failed
  pageCount: integer("page_count"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const wikiPages = sqliteTable("wiki_pages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  title: text("title").notNull(),
  type: text("type").notNull(), // source, entity, concept, comparison, synthesis, query
  filePath: text("file_path").notNull(),
  tags: text("tags"), // JSON array
  content: text("content"), // cached content for search
  linkCount: integer("link_count").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const chatSessions = sqliteTable("chat_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  title: text("title").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => chatSessions.id),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const lintFindings = sqliteTable("lint_findings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  jobId: integer("job_id"),
  // "project" — regular per-project lint finding (default, back-compat).
  // "parent"  — parent-level lint finding (promotion candidates, recurring
  //             themes, cross-child gaps). Scoped to a parent project.
  scope: text("scope").notNull().default("project"),
  category: text("category").notNull(), // orphan, missing_concept, contradiction, stale_claim, missing_cross_ref, suggested_question, promotion_candidate, recurring_theme, parent_gap
  severity: text("severity").notNull().default("info"), // info, warn
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetPage: text("target_page"), // wiki/... path, or null for suggestions
  suggestedAction: text("suggested_action"),
  status: text("status").notNull().default("open"), // open, dismissed, resolved
  dedupeKey: text("dedupe_key").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  type: text("type").notNull(), // ingest, query, lint, research
  title: text("title").notNull(),
  status: text("status").notNull().default("queued"), // queued, running, completed, failed, cancelled
  pid: integer("pid"),
  output: text("output"),
  error: text("error"),
  // Structured failure taxonomy — raw `error` stays for diagnostics; UI branches on this.
  // null = generic/unclassified failure. Values: provider_unavailable, model_not_found,
  // auth_failed, rate_limited, timeout, unknown
  errorCode: text("error_code"),
  progress: text("progress"), // JSON: { current: number, total: number }
  // Model resolved at spawn time — persisted so the /jobs page and the
  // running-jobs panel can show which LLM drove each job without having to
  // guess from the (possibly drifted) current setting.
  model: text("model"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
