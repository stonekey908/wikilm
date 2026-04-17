import { NextRequest } from "next/server";
import { db } from "@/db";
import { lintFindings } from "@/db/schema";
import { eq } from "drizzle-orm";

const VALID_STATUSES = new Set(["open", "dismissed", "resolved"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const findingId = parseInt(id, 10);

  if (isNaN(findingId)) {
    return Response.json({ error: "Invalid finding ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const status = body?.status;

  if (!VALID_STATUSES.has(status)) {
    return Response.json(
      { error: `status must be one of: ${[...VALID_STATUSES].join(", ")}` },
      { status: 400 }
    );
  }

  const existing = db
    .select()
    .from(lintFindings)
    .where(eq(lintFindings.id, findingId))
    .get();

  if (!existing) {
    return Response.json({ error: "Finding not found" }, { status: 404 });
  }

  db.update(lintFindings)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(lintFindings.id, findingId))
    .run();

  return Response.json({ success: true });
}
