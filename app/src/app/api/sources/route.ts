import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const allSources = db
    .select()
    .from(sources)
    .where(eq(sources.projectId, 1))
    .all();

  return Response.json({ sources: allSources });
}
