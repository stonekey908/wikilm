import { buildTree } from "@/lib/projects";

export async function GET() {
  return Response.json({ tree: buildTree() });
}
