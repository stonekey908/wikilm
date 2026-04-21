---
type: concept
name: "Dense Retrieval"
tags: [retrieval, embeddings, vector-search, rag, nlp, information-retrieval]
---

# Dense Retrieval

A retrieval paradigm that encodes both queries and documents into continuous vector representations (embeddings) and retrieves the most relevant documents by measuring similarity in the embedding space — typically via cosine similarity or inner product. Dense retrieval is the primary retrieval mechanism underlying modern [[retrieval-augmented-generation]] systems.

## How It Works

1. **Offline indexing** — each document chunk is passed through an *encoder* (usually a bi-encoder architecture like DPR, sentence-transformers, or a BERT-family model) to produce a fixed-dimensional embedding vector. All embeddings are stored in a vector database.
2. **Online retrieval** — at query time, the query is encoded by the same (or a compatible) encoder. An approximate nearest neighbour (ANN) search retrieves the top-*k* embeddings by similarity score.
3. **Return** — the source text associated with the retrieved embeddings is passed to the generator.

## Key Properties

- **Semantic matching** — captures meaning rather than lexical overlap; can retrieve documents that use different words but express the same concept
- **Sub-linear search** — ANN algorithms (HNSW, IVF, PQ via FAISS/Pinecone/Weaviate) make retrieval tractable over billions of vectors
- **Encoder dependence** — retrieval quality is bounded by the quality of the encoder; domain mismatch between pre-training and the target corpus degrades performance

## Common Encoder Models

- **DPR (Dense Passage Retrieval)** — trained with in-batch negative contrastive learning; widely used baseline
- **Sentence-BERT / sentence-transformers** — general-purpose semantic similarity encoders
- **E5, GTE, BGE** — more recent encoders optimised for retrieval tasks across multiple languages and domains
- **Specialised encoders** — fine-tuned on domain data (medical, legal, code) for domain-specific RAG

## Strengths vs. [[sparse-retrieval]]

| Dimension | Dense | Sparse |
|---|---|---|
| Semantic matching | Strong | Weak |
| Exact keyword matching | Weak | Strong |
| Out-of-vocabulary terms | Graceful degradation | Failure |
| Latency at scale | Requires ANN tuning | Generally faster |
| Interpretability | Low | High |

In practice, **[[hybrid-retrieval]]** — combining dense and sparse scores — outperforms either alone and is the current best practice as documented in [[rag-comprehensive-survey-2410-12837]].

## Relevance to RAG

Dense retrieval is the default retrieval layer in [[naive-rag]], [[advanced-rag]], and [[modular-rag]] pipelines. Improvements to the encoder (fine-tuning, knowledge distillation), to the ANN index (compression, caching), and to query processing (HyDE, query rewriting) are the main levers for improving dense retrieval quality.

## Sources

- [[rag-comprehensive-survey-2410-12837]] — reviews dense retrieval within the broader RAG technology landscape
- [[rag-comprehensive-survey-2506-00054]] — discusses SEER, FILCO, and RQ-RAG, which build on dense retrieval
