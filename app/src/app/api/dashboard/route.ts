import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { desc, inArray } from "drizzle-orm";

const WIKI_DIR = path.join(process.cwd(), "..", "wiki");

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

function countMarkdownFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countMarkdownFiles(path.join(dir, entry.name));
    } else if (entry.name.endsWith(".md")) {
      count++;
    }
  }
  return count;
}

function getStats(): WikiStats {
  return {
    sources: countMarkdownFiles(path.join(WIKI_DIR, "sources")),
    wikiPages:
      countMarkdownFiles(WIKI_DIR) - 2, // subtract index.md and log.md
    entities: countMarkdownFiles(path.join(WIKI_DIR, "entities")),
    concepts: countMarkdownFiles(path.join(WIKI_DIR, "concepts")),
  };
}

function parseLogEntries(limit: number): LogEntry[] {
  const logPath = path.join(WIKI_DIR, "log.md");
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

export async function GET() {
  const stats = getStats();
  const recentActivity = parseLogEntries(10);

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
