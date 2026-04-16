---
type: concept
tags: [ai, llm, search, knowledge-management]
---

# Retrieval-Augmented Generation (RAG)

A technique where documents are chopped into small chunks, converted into mathematical representations (embeddings), and stored in a vector database. When you ask a question, the system searches for the most similar chunks and feeds them to an AI to generate an answer.

## How It Works

1. Documents split into chunks
2. Chunks converted to embeddings (vector representations)
3. At query time, question is embedded and similar chunks are retrieved
4. Retrieved chunks are fed to the LLM as context
5. LLM generates an answer from the chunks

## Limitations (per Karpathy's Critique)

As described in [[karpathy-second-brain-medium-article]], RAG has a fundamental limitation:

- **No accumulation**: The AI rediscovers knowledge from scratch every time. Nothing compounds.
- **No structure**: There's no memory, no map of how ideas relate to each other.
- **Fragmented retrieval**: Questions requiring connections across many documents force the system to find and stitch together the right fragments every time.
- **No persistent understanding**: Each query starts from zero.

## Contrast with LLM Wiki Pattern

The [[llm-wiki-pattern]] addresses these limitations by having the LLM read raw material once and compile it into structured, organized wiki pages. At query time, the AI reads the already-organized wiki rather than searching a vector database. Knowledge accumulates with each ingest and query.

## Role in Agentic AI

[[agentic-ai]] systems use RAG as a core component to ground autonomous reasoning in real-world data ([[deloitte-agentic-ai-banking]]). Agents combine:
- **LLM backbone** for reasoning about goals and trade-offs
- **RAG layer** to retrieve relevant context/knowledge from documents, databases, and live data sources
- **Action interfaces** (APIs, tools) to execute decisions in the world
- **Feedback loops** to observe outcomes and adapt

RAG enables agents to make decisions informed by current information rather than relying solely on training data. Example: JPMorgan Chase's LAW uses RAG to retrieve relevant legal precedents and clauses before answering legal queries with 92.9% accuracy.

## Sources

- [[karpathy-second-brain-medium-article]]
- [[deloitte-agentic-ai-banking]]
