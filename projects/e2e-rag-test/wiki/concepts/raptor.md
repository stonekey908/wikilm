---
type: concept
tags: [rag, raptor, hierarchical-retrieval, chunking, blinkered-chunk-effect]
---

# RAPTOR

**Recursive Abstractive Processing for Tree-Organised Retrieval.** A [[retrieval-augmented-generation]] extension that overcomes the [[blinkered-chunk-effect]] by building a hierarchical tree of progressively summarised chunks, enabling retrieval at multiple levels of abstraction.

## The Problem It Solves

Plain vanilla RAG retrieves raw document chunks. When a query requires understanding that spans multiple chunks — or when individual chunks are too narrow to answer without their broader context — retrieval fails (the [[blinkered-chunk-effect]]). RAPTOR addresses this by ensuring that summarised, high-level representations of the content are also retrievable.

## How It Works

1. **Cluster** — raw document chunks are grouped by semantic similarity
2. **Summarise** — an LLM generates an abstractive summary of each cluster, producing a higher-level chunk
3. **Repeat** — the summaries are themselves clustered and summarised recursively, building a tree
4. **Retrieve** — at query time, the retrieval system can match against leaf chunks (fine-grained) or summarised nodes (coarse-grained), depending on what the query requires

## Effect

By retrieving at the right level of the tree, RAPTOR supplies the LLM with contextually complete information rather than an orphaned fragment. A question spanning multiple sections can be answered using a high-level summary node, while a detail-specific question retrieves a leaf chunk.

## Relationship to Other Concepts

- Directly addresses [[blinkered-chunk-effect]] — the absence of context that haunts plain vanilla [[retrieval-augmented-generation]]
- Complements [[graphrag]], which takes a different structural approach (knowledge graph rather than summarisation hierarchy)

## Sources

- [[retrieval-augmented-generation-klesel-wittmann-2025]] — identifies RAPTOR as a primary architectural response to the BCE in a business IS context
