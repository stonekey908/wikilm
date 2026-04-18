import { detectGemini } from "@/lib/gemini-runner";

export async function GET() {
  const result = await detectGemini();
  return Response.json({
    available: result.available,
    version: result.version,
    models: result.models,
  });
}
