import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Manual backup endpoint.
 *
 * Produces two snapshot files under <repo-root>/backups/:
 *   db-YYYY-MM-DD-HHMMSS.sql    — sqlite3 .dump (plain text, git-friendly)
 *   wiki-YYYY-MM-DD-HHMMSS.tar.gz — tar of wiki/
 *
 * Keeps the 14 newest of each; older ones are pruned.
 * Stamps settings.last_backup_at + last_backup_path so Settings can show it.
 */

const PROJECT_ROOT = path.join(process.cwd(), "..");
const BACKUP_DIR = path.join(PROJECT_ROOT, "backups");
const DB_PATH = path.join(PROJECT_ROOT, "secondbrain.db");
const WIKI_DIR = path.join(PROJECT_ROOT, "wiki");
const KEEP_COUNT = 14;

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

function pruneOldest(prefix: string, suffix: string) {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith(suffix))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  for (const { name } of files.slice(KEEP_COUNT)) {
    fs.unlinkSync(path.join(BACKUP_DIR, name));
  }
}

function upsertSetting(key: string, value: string) {
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) {
    db.update(settings).set({ value }).where(eq(settings.key, key)).run();
  } else {
    db.insert(settings).values({ key, value }).run();
  }
}

export async function POST() {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const ts = timestamp();
    const dbFile = `db-${ts}.sql`;
    const wikiFile = `wiki-${ts}.tar.gz`;
    const dbPath = path.join(BACKUP_DIR, dbFile);
    const wikiPath = path.join(BACKUP_DIR, wikiFile);

    // DB dump — sqlite3 .dump is deterministic and plain-text
    execSync(`sqlite3 ${JSON.stringify(DB_PATH)} .dump > ${JSON.stringify(dbPath)}`, {
      shell: "/bin/bash",
      stdio: "pipe",
    });

    // Wiki archive — relative path inside PROJECT_ROOT so the tar is clean
    if (fs.existsSync(WIKI_DIR)) {
      execSync(`tar -czf ${JSON.stringify(wikiPath)} -C ${JSON.stringify(PROJECT_ROOT)} wiki`, {
        shell: "/bin/bash",
        stdio: "pipe",
      });
    }

    pruneOldest("db-", ".sql");
    pruneOldest("wiki-", ".tar.gz");

    const now = new Date().toISOString();
    upsertSetting("last_backup_at", now);
    upsertSetting("last_backup_path", BACKUP_DIR);
    upsertSetting("last_backup_db_file", dbFile);
    upsertSetting("last_backup_wiki_file", wikiFile);

    return Response.json(
      {
        ok: true,
        timestamp: now,
        location: BACKUP_DIR,
        files: { db: dbFile, wiki: wikiFile },
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backup failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
