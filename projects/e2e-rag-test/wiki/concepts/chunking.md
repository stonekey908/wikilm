---
type: concept
tags: [rag, indexing, text-processing, chunking, retrieval]
---

# Chunking

The process of splitting source documents into smaller segments (chunks) during the indexing phase of [[retrieval-augmented-generation]]. Chunk boundaries and sizes directly determine what context the retrieval step can surface — making chunking strategy one of the most consequential decisions in RAG system design.

## Role in the RAG Pipeline

In the indexing phase:
1. Source documents are divided into chunks
2. Each chunk is independently embedded into a vector
3. Vectors are stored in a [[vector-database]]

At retrieval time, the query embedding is compared to chunk embeddings; top-k most similar chunks are returned to the generator.

## Chunking Strategies

| Strategy | Description | Trade-off |
|---|---|---|
| Fixed-size | Constant character or token count, optional overlap | Simple; ignores semantic boundaries |
| Sentence-boundary | Split at sentence delimiters | Preserves coherent units; variable chunk size |
| Paragraph-boundary | Split at paragraph breaks | Natural semantic units; chunks can be very long |
| Recursive | Tries progressively smaller delimiters (paragraph → sentence → word) | Adapts to document structure |
| Sliding window | Chunks overlap by N% with neighbours | Reduces context loss at boundaries |
| Semantic chunking | Embedding similarity determines split points | Semantically coherent; compute-intensive |

## The Blinkered Chunk Effect

Chunking introduces the [[blinkered-chunk-effect]] (BCE): a chunk extracted from context may be meaningless or misleading without the surrounding document. A chunk about "the defendant's prior agreement" is opaque if the agreement was defined three paragraphs earlier. Chunking strategy choices (size, overlap, boundary method) modulate how severe the BCE is in practice.

## Sources

- [[retrieval-augmented-generation-klesel-wittmann-2025]] — introduces BCE as the central chunking limitation of plain vanilla RAG
