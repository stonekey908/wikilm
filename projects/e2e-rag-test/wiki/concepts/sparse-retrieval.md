---
type: concept
name: "Sparse Retrieval"
tags: [retrieval, bm25, tf-idf, keyword-search, rag, information-retrieval]
---

# Sparse Retrieval

A retrieval paradigm that represents documents and queries as high-dimensional vectors in which most entries are zero — one dimension per vocabulary term — and scores relevance by term overlap. Sparse retrieval is the classical information-retrieval approach, predating neural methods by decades, and remains a competitive and complementary component in modern [[retrieval-augmented-generation]] pipelines.

## How It Works

Each document chunk and query is represented as a *bag of terms* with associated weights:

- **TF-IDF** — weight = term frequency in document × inverse document frequency across corpus. Emphasises rare, discriminative terms.
- **BM25 (Best Match 25)** — probabilistic extension of TF-IDF that also accounts for document length normalisation and term saturation. The dominant sparse retrieval algorithm in practice.

Retrieval is an inverted-index lookup: the index maps each term to the list of documents containing it. Query evaluation is fast and exact.

## Key Properties

- **Exact lexical matching** — precise for queries with specific technical terms, entity names, product codes, or jargon
- **No training required** — BM25 is a parametric-free algorithm; no encoder fine-tuning needed
- **Deterministic and interpretable** — the score is a transparent function of term overlap; easy to debug
- **Fails on paraphrase** — if the query and document use different words for the same concept, sparse retrieval scores zero even for a perfect semantic match

## Comparison with [[dense-retrieval]]

| Dimension | Sparse (BM25) | Dense (embedding) |
|---|---|---|
| Keyword precision | Excellent | Moderate |
| Semantic generalisation | Poor | Excellent |
| Out-of-vocabulary handling | Fails | Degrades gracefully |
| Latency at scale | Very fast | Requires ANN |
| Infrastructure | Inverted index (Elasticsearch, Lucene, BM25s) | Vector database (FAISS, Pinecone, Weaviate) |

## Role in RAG

Sparse retrieval is rarely used alone in modern RAG systems. Its value is as a complement to [[dense-retrieval]] in **[[hybrid-retrieval]]** pipelines, where BM25 scores and embedding similarity scores are combined (e.g. via Reciprocal Rank Fusion). This hybrid approach leverages the lexical precision of sparse methods and the semantic coverage of dense methods, consistently outperforming either alone.

As discussed in [[rag-comprehensive-survey-2410-12837]], hybrid retrieval is identified as a key improvement over [[naive-rag]], and is a standard component in [[advanced-rag]] systems.

## Sources

- [[rag-comprehensive-survey-2410-12837]] — reviews sparse retrieval in the context of RAG technology evolution
- [[rag-comprehensive-survey-2506-00054]] — RankRAG and RAG-Fusion pipelines combine sparse and dense signals
