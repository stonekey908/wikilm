---
type: concept
name: "Advanced RAG"
tags: [rag, retrieval-augmented-generation, architecture, retrieval, query-rewriting, reranking]
---

# Advanced RAG

The second generation of [[retrieval-augmented-generation]] systems, defined by the addition of pre-retrieval and post-retrieval processing stages around the core [[naive-rag]] pipeline. Advanced RAG treats retrieval precision as the primary lever for improving generation quality and introduces dedicated components to raise it.

## What Advanced RAG Adds

### Pre-Retrieval (Query-Side)

Transformations applied to the query *before* the retrieval step to improve recall:

- **Query rewriting** — rephrase the user's question to be more precise or to avoid ambiguous terms
- **Query expansion** — generate multiple reformulations of the same query and merge results (RAG-Fusion pattern)
- **HyDE (Hypothetical Document Embeddings)** — generate a hypothetical answer to the query, embed that, and retrieve documents similar to the hypothetical answer rather than the raw query; exploits the distributional overlap between expected answer text and source documents
- **Step-back prompting** — abstract the concrete question to a more general form, retrieve for the general form, then narrow down

### Post-Retrieval (Context-Side)

Transformations applied to retrieved chunks *before* generation to improve precision:

- **Reranking** — a cross-encoder model scores each retrieved chunk against the query and reorders them; top-ranked chunks enter the prompt while lower-ranked ones are discarded
- **Context compression / summarisation** — distil the retrieved chunks into shorter, denser representations to stay within the context window without losing key facts
- **Relevance filtering** — remove chunks that pass the vector similarity threshold but fail a secondary relevance check (FILCO, SEER)

### Improved Indexing

- **Sliding window chunking** — overlapping windows preserve context that fixed-size chunks lose at boundaries
- **Hierarchical indexing** — small chunks for retrieval precision, larger parent chunks fed to the generator to avoid the blinkered-chunk problem (see [[retrieval-augmented-generation-klesel-wittmann-2025]])
- **Sentence-level chunking** — semantic boundaries respect natural units of meaning

## Key Systems

- **RQ-RAG** — query decomposition into sub-questions; >800% improvement on multi-hop QA
- **RAG-Fusion** — query reformulation + reciprocal rank fusion across result sets
- **CRAG** — evaluates evidence quality at inference time, routing to web search when local retrieval fails
- **SELF-RAG** — post-retrieval critique loop that revises generated output against retrieved evidence

## Strengths Over Naive RAG

Advanced RAG substantially improves retrieval precision and context quality, translating to measurable gains in factual accuracy on benchmarks like PopQA, HotpotQA, and TriviaQA (see [[rag-comprehensive-survey-2410-12837]] for comparative figures).

## Limitations

- More components means more latency and implementation complexity
- Pre/post-retrieval modules must be tuned per domain; no universal optimisation
- Still a *fixed* pipeline — components cannot be rearranged or swapped at runtime, which [[modular-rag]] addresses

## Sources

- [[rag-comprehensive-survey-2410-12837]] — §3–4 describe Advanced RAG techniques and their performance
- [[rag-comprehensive-survey-2506-00054]] — covers SELF-RAG, CRAG, RQ-RAG in detail under the architecture taxonomy
