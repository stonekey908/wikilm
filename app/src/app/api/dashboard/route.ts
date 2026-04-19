import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { desc, inArray } from "drizzle-orm";
import { getProject, wikiDir } from "@/lib/projects";
import { getAllMdFiles } from "@/lib/wiki-utils";

interface WikiStats {
  sources: number;
  wikiPages: number;
  entities: number;
  concepts: number;
}

interface LogEntry {
  date: string;
  operation: string;
  title: string;
  details: string;
}

/** Thin wrapper: we only need the count here, not the paths. */
function countMarkdownFiles(dir: string): number {
  return getAllMdFiles(dir).length;
}

function getStats(wikiPath: string): WikiStats {
  return {
    sources: countMarkdownFiles(path.join(wikiPath, "sources")),
    wikiPages:
      countMarkdownFiles(wikiPath) - 2, // subtract index.md and log.md
    entities: countMarkdownFiles(path.join(wikiPath, "entities")),
    concepts: countMarkdownFiles(path.join(wikiPath, "concepts")),
  };
}

function parseLogEntries(wikiPath: string, limit: number): LogEntry[] {
  const logPath = path.join(wikiPath, "log.md");
  if (!fs.existsSync(logPath)) return [];

  const content = fs.readFileSync(logPath, "utf-8");
  const entries: LogEntry[] = [];

  // Match ## [YYYY-MM-DD] operation | Title
  const entryRegex = /^## \[(\d{4}-\d{2}-\d{2})\]\s+(\w+)\s+\|\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  const matches: { date: string; operation: string; title: string; index: number }[] = [];
  while ((match = entryRegex.exec(content)) !== null) {
    matches.push({
      date: match[1],
      operation: match[2],
      title: match[3],
      index: match.index + match[0].length,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index - matches[i + 1].date.length - matches[i + 1].operation.length - matches[i + 1].title.length - 10 : content.length;
    const details = content.slice(m.index, nextIndex).trim();
    entries.push({
      date: m.date,
      operation: m.operation,
      title: m.title,
      details,
    });
  }

  // Return most recent first, limited
  return entries.reverse().slice(0, limit);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectIdParam = searchParams.get("projectId");
  const projectId = projectIdParam ? Number(projectIdParam) : NaN;
  const project =
    (Number.isFinite(projectId) ? getProject(projectId) : null) ?? getProject(1);
  const wikiPath = project
    ? wikiDir(project)
    : path.join(process.cwd(), "..", "wiki");

  const stats = getStats(wikiPath);
  const recentActivity = parseLogEntries(wikiPath, 10);

  const activeJobs = db
    .select()
    .from(jobs)
    .where(inArray(jobs.status, ["queued", "running"]))
    .orderBy(desc(jobs.createdAt))
    .limit(10)
    .all();

  const recentJobs = db
    .select()
    .from(jobs)
    .orderBy(desc(jobs.createdAt))
    .limit(5)
    .all();

  return NextResponse.json({
    stats,
    recentActivity,
    activeJobs,
    recentJobs,
  });
}
