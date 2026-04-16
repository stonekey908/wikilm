// MOCK: Replace with real claude CLI integration. See SETUP.md.

const MOCK_RESPONSES: Record<string, string[]> = {
  ingest: [
    "Reading source file...",
    "Parsing content and extracting key concepts...",
    "Creating source summary page: wiki/sources/mock-source.md",
    "Identified 3 entities: OpenAI, GPT-4, Transformer Architecture",
    "Creating entity page: wiki/entities/openai.md",
    "Creating concept page: wiki/concepts/transformer-architecture.md",
    "Processing 4/8 pages",
    "Adding [[wikilinks]] to existing pages...",
    "Processing 6/8 pages",
    "Processing 8/8 pages",
    "Updating wiki/index.md...",
    "Updating wiki/log.md...",
    "Ingest complete — 8 wiki pages created or updated.",
  ],
  query: [
    "Reading wiki/index.md to find relevant pages...",
    "Found 5 relevant pages for your query.",
    "Reading wiki/concepts/transformer-architecture.md...",
    "Reading wiki/entities/openai.md...",
    "",
    "## Answer",
    "",
    "Based on the wiki content, here's what I found:",
    "",
    "The **transformer architecture** was introduced in the paper [[attention-is-all-you-need]] by Vaswani et al.",
    "It uses self-attention mechanisms to process sequences in parallel, unlike recurrent models.",
    "",
    "Key entities involved: [[openai]], [[google-deepmind]]",
    "",
    "Related concepts: [[self-attention]], [[positional-encoding]], [[multi-head-attention]]",
  ],
  lint: [
    "Starting wiki health check...",
    "Scanning for orphan pages...",
    "Found 1 orphan page: wiki/queries/old-question.md",
    "Checking for contradictions...",
    "No contradictions found.",
    "Checking for missing cross-references...",
    "Found 2 concepts mentioned frequently but lacking their own page:",
    "  - reinforcement learning (mentioned 4 times)",
    "  - prompt engineering (mentioned 3 times)",
    "Lint complete — 1 orphan, 2 suggested new pages.",
  ],
  research: [
    "Searching the web for relevant sources...",
    "Found 5 potential sources.",
    "Analyzing relevance to your knowledge base...",
    'Result 1: "Toolformer: Language Models Can Teach Themselves to Use Tools" (96% relevant)',
    'Result 2: "ReAct: Synergizing Reasoning and Acting" (93% relevant)',
    'Result 3: "Voyager: An Open-Ended Embodied Agent" (91% relevant)',
    "Research complete — 5 sources discovered.",
  ],
};

export function getMockResponse(type: string): string[] {
  return MOCK_RESPONSES[type] || MOCK_RESPONSES.query;
}

export function createMockStream(type: string): ReadableStream {
  const lines = getMockResponse(type);
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream({
    async pull(controller) {
      if (index >= lines.length) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done", code: 0 })}\n\n`)
        );
        controller.close();
        return;
      }

      const line = lines[index];
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "content", text: line })}\n\n`)
      );
      index++;

      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));
    },
  });
}
