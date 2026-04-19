import { NextRequest } from "next/server";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get("projectId");
  const projectId = param ? Number(param) : 1;
  const allSources = db
    .select()
    .from(sources)
    .where(eq(sources.projectId, Number.isFinite(projectId) ? projectId : 1))
    .all();

  return Response.json({ sources: allSources });
}
