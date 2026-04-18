import { db } from "@/db";
import { settings } from "@/db/schema";
import { inArray } from "drizzle-orm";
import path from "path";

const DEFAULT_BACKUP_DIR = path.join(process.cwd(), "..", "backups");

export async function GET() {
  const rows = db
    .select()
    .from(settings)
    .where(
      inArray(settings.key, [
        "last_backup_at",
        "last_backup_path",
        "last_backup_db_file",
        "last_backup_content_file",
        "last_backup_wiki_file", // legacy — keep reading for pre-STO-1752 rows
      ])
    )
    .all();

  const map = new Map(rows.map((r) => [r.key, r.value]));

  return Response.json({
    lastBackupAt: map.get("last_backup_at") ?? null,
    location: map.get("last_backup_path") ?? DEFAULT_BACKUP_DIR,
    lastDbFile: map.get("last_backup_db_file") ?? null,
    lastContentFile:
      map.get("last_backup_content_file") ??
      map.get("last_backup_wiki_file") ??
      null,
  });
}
