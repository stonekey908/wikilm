---
type: concept
tags: [rag, vector-search, embeddings, indexing, infrastructure]
---

# Vector Database

A database optimised for storing and querying high-dimensional vector embeddings. In [[retrieval-augmented-generation]], the vector database holds the embedded representations of all document [[chunking|chunks]] and is queried via approximate nearest-neighbour (ANN) search to find chunks semantically relevant to a user's query.

## Role in RAG

The vector database is the non-parametric memory component of RAG — the counterpart to the LLM's parametric (weight-encoded) knowledge:

1. **Indexing time:** each chunk is embedded by an encoder model (e.g. a bi-encoder) → embedding stored alongside metadata (source ID, position, date)
2. **Query time:** the user query is embedded → ANN search returns top-k closest chunk embeddings → full chunk text is passed to the LLM as context

## Why Vector Databases Instead of Fine-Tuning?

Per [[retrieval-augmented-generation-klesel-wittmann-2025]], creating and maintaining a vector database is far less compute-intensive than fine-tuning the LLM on the same data. Additional advantages:

- Knowledge can be updated without retraining — re-embed and re-index changed documents
- Source attribution is native — each chunk carries provenance metadata
- Organisational data stays external and auditable

## Common Systems

Examples of vector database systems include Pinecone, Weaviate, Qdrant, Chroma, Milvus, and pgvector (PostgreSQL extension). Existing databases (e.g. Elasticsearch with dense vector fields) can serve a hybrid sparse+dense retrieval role.

## Limitations

- Embedding quality bounds retrieval quality — domain mismatch between the encoder and the corpus degrades results
- ANN search introduces approximate recall — some relevant chunks may be missed
- Stale embeddings if documents change but the index is not refreshed

## Sources

- [[retrieval-augmented-generation-klesel-wittmann-2025]] — positions the vector database as the non-parametric memory in RAG; notes its lower cost vs. fine-tuning
