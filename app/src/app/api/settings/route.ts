import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET() {
  const rows = db.select().from(settings).all();
  const obj: Record<string, string> = {};
  for (const row of rows) {
    obj[row.key] = row.value;
  }
  return Response.json(obj);
}

export async function PUT(request: NextRequest) {
  const body: Record<string, string> = await request.json();

  for (const [key, value] of Object.entries(body)) {
    const existing = db.select().from(settings).where(eq(settings.key, key)).get();
    if (existing) {
      db.update(settings).set({ value }).where(eq(settings.key, key)).run();
    } else {
      db.insert(settings).values({ key, value }).run();
    }
  }

  return Response.json({ success: true });
}
