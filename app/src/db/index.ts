import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";

const DB_PATH = path.join(process.cwd(), "..", "secondbrain.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
/** Raw better-sqlite3 instance — use for `.transaction(...)` (Drizzle's
 * better-sqlite3 driver doesn't expose a wrapper). */
export const sqliteDb = sqlite;
