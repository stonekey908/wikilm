import { detectOllamaModels } from "@/lib/ollama-runner";

export async function GET() {
  const models = await detectOllamaModels();
  return Response.json({
    available: models.length > 0,
    models,
  });
}
