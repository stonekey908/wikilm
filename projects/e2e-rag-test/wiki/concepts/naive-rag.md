---
type: concept
name: "Naive RAG"
tags: [rag, retrieval-augmented-generation, architecture, pipeline, baseline]
---

# Naive RAG

The first and simplest generation of [[retrieval-augmented-generation]] systems. Naive RAG establishes the baseline retrieve-then-generate pipeline: index documents into a vector store, retrieve the top-*k* closest chunks at query time, prepend them to the prompt, and generate a response. It is the paradigm against which all subsequent RAG improvements are measured.

## Pipeline

1. **Indexing** — split source documents into fixed-size or sentence-boundary chunks; embed each chunk using an encoder model; store (embedding, text) pairs in a vector database
2. **Retrieval** — encode the user query; fetch top-*k* chunks by cosine similarity or inner product
3. **Generation** — concatenate retrieved chunks with the query into a prompt; pass to the LLM; return the output

## Strengths

- Simple to implement; off-the-shelf components (an encoder, a vector DB, an LLM) are sufficient
- Establishes measurable grounding: generation is tied to real documents
- Effective baseline for factoid question-answering over well-structured corpora

## Limitations

As catalogued in [[rag-comprehensive-survey-2410-12837]], Naive RAG suffers from several structural weaknesses:

- **Low retrieval precision** — fixed-size chunks often split coherent ideas, and cosine similarity retrieves topically adjacent but irrelevant content
- **Context window pressure** — large-*k* retrieval floods the prompt with noise, increasing hallucination risk and inference cost
- **No query understanding** — the raw user query is embedded directly, without any reformulation to improve recall
- **No post-retrieval filtering** — all retrieved chunks are used verbatim, regardless of relevance or quality
- **Single-pass retrieval** — cannot handle [[multi-hop-reasoning]] questions that require chaining multiple retrieved facts

These limitations motivated the development of [[advanced-rag]] and [[modular-rag]].

## Relationship to Other Paradigms

| Aspect | Naive RAG | [[advanced-rag]] | [[modular-rag]] |
|---|---|---|---|
| Query processing | Raw query | Query rewriting / HyDE | Configurable module |
| Retrieval | Top-k similarity | Hybrid + reranking | Pluggable retriever |
| Post-retrieval | None | Compression / reranking | Configurable module |
| Flexibility | Low | Medium | High |

## Sources

- [[rag-comprehensive-survey-2410-12837]] — §3 introduces Naive RAG as the first evolutionary stage
