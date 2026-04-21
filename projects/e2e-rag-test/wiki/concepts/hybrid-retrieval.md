---
type: concept
name: "Hybrid Retrieval"
tags: [retrieval, bm25, embeddings, rag, information-retrieval, reciprocal-rank-fusion]
---

# Hybrid Retrieval

A retrieval strategy that combines [[dense-retrieval]] (embedding-based semantic similarity) with [[sparse-retrieval]] (BM25/TF-IDF keyword matching) to exploit the complementary strengths of each paradigm. Hybrid retrieval is the current best practice in production [[retrieval-augmented-generation]] systems, consistently outperforming either approach used alone.

## Why Neither Alone Is Enough

| Failure mode | Dense only | Sparse only |
|---|---|---|
| Query uses exact technical terms (product codes, names) | May miss exact matches | Handles well |
| Query is a paraphrase of document wording | Handles well | Scores zero |
| Out-of-vocabulary terms | Degrades gracefully | Fails completely |
| Short queries with high ambiguity | Uncertain | Anchored to literal terms |

Combining both eliminates each paradigm's blind spot: dense retrieval covers semantic generalisation; sparse retrieval covers lexical precision.

## Reciprocal Rank Fusion (RRF)

The dominant score-merging algorithm. Rather than combining raw similarity scores (which live on incomparable scales), RRF combines the rank positions from each retrieval list:

> **RRF(d) = Σ 1 / (k + rank_i(d))**

- **d** = document
- **rank_i(d)** = position of document d in retrieval list i
- **k** = smoothing constant (typically 60)

RRF is robust, parameter-light, and outperforms linear score fusion in most benchmarks because it is insensitive to score magnitude differences between retrieval systems.

## Alternative Fusion Methods

- **Linear interpolation** — `score = α · dense_score + (1−α) · sparse_score` — requires tuning α per domain
- **Learned fusion** — a small model predicts relevance from both scores + query features; higher ceiling but needs labelled data
- **Re-ranking** — a cross-encoder re-scores the merged candidate list; commonly layered on top of RRF for further precision gains (see [[advanced-rag]])

## Infrastructure

A hybrid pipeline requires two retrieval backends running in parallel:

1. **Inverted index** (Elasticsearch, OpenSearch, BM25s, Lucene) for sparse retrieval
2. **Vector database** (FAISS, Pinecone, Weaviate, Qdrant — see [[vector-database]]) for dense retrieval

Fusion is applied at the application layer after both sets of results are returned.

## Use Cases Where Hybrid Excels

- **Domain-specific corpora** with heavy terminology (legal, medical, code) — sparse handles jargon, dense handles intent
- **Long-tail queries** — rare exact strings retrieved by sparse; semantic context filled by dense
- **[[multi-hop-reasoning]]** pipelines — broader candidate sets from hybrid improve recall at each retrieval step
- **E-commerce / enterprise search** — product codes + natural-language descriptions both matter

## Position in the RAG Stack

Hybrid retrieval sits in the retrieval layer of [[advanced-rag]] and [[modular-rag]] architectures, replacing or augmenting the single-vector-store retriever used in [[naive-rag]]. It is the starting point for retrieval quality improvements before turning to more expensive interventions (fine-tuned encoders, query rewriting, HyDE).

## Sources

- [[rag-comprehensive-survey-2410-12837]] — identifies hybrid retrieval as a key improvement over naive RAG; positions it within the Advanced RAG paradigm
- [[rag-comprehensive-survey-2506-00054]] — RAG-Fusion pipeline (RRF over multiple query rewritings) is a direct extension of hybrid retrieval principles
- [[retrieval-augmented-generation-klesel-wittmann-2025]] — recommends hybrid retrieval as part of the architectural response to the [[blinkered-chunk-effect]]
