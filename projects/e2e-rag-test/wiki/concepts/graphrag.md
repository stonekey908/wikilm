---
type: concept
tags: [rag, knowledge-graph, graph-retrieval, multi-hop-reasoning, graphrag]
---

# GraphRAG

A [[retrieval-augmented-generation]] extension that replaces or supplements vector-similarity chunk retrieval with a structured knowledge graph extracted from the source corpus. Instead of retrieving isolated text fragments, GraphRAG retrieves entity-relationship subgraphs, enabling multi-hop reasoning and context-rich generation.

## The Problem It Solves

Plain vanilla RAG retrieves semantically similar chunks but cannot traverse explicit relationships between entities. A query like "What projects did Company A collaborate on with Company B after they merged with Company C?" requires following a chain of relationships — not matching a single passage. This is both a [[blinkered-chunk-effect]] problem (chunks lack relational context) and a [[multi-hop-reasoning]] problem (the answer requires combining facts from multiple sources).

## How It Works

1. **Extraction** — an LLM or NLP pipeline reads the source corpus and extracts entities (people, organisations, products, events) and their relationships
2. **Graph construction** — entities become nodes; relationships become directed edges with labels and optional weights
3. **Hierarchy building** — the graph is organised into a hierarchy (communities of related entities, topic clusters, summary nodes)
4. **Retrieval** — at query time, graph traversal or graph embedding search identifies the relevant subgraph; the subgraph (or its summary) is returned as context alongside or instead of raw chunks

## Advantages over Plain Vector Retrieval

| Capability | Plain RAG | GraphRAG |
|---|---|---|
| Single-document fact retrieval | ✓ | ✓ |
| Multi-hop relationship traversal | ✗ | ✓ |
| Entity co-reference across documents | ✗ | ✓ |
| Contextual relationship explanation | ✗ | ✓ |
| Scalability to very large corpora | ✓ | Harder (graph construction cost) |

## Relationship to Other Concepts

- Directly mitigates [[blinkered-chunk-effect]] by supplying relational context alongside text
- Enables [[multi-hop-reasoning]] by allowing traversal over entity relationship chains
- Often combined with [[vector-database]] retrieval in hybrid pipelines (graph provides structure; vectors provide semantic similarity)
- [[raptor]] is an alternative extension targeting the BCE through summarisation hierarchies rather than graph structure

## Sources

- [[retrieval-augmented-generation-klesel-wittmann-2025]] — surveys GraphRAG as a key RAG extension for business IS contexts; describes knowledge graph extraction and hierarchy construction
- [[rag-comprehensive-survey-2506-00054]] — notes Dual-Pathway KG-RAG (−18% hallucinations) and KRAGEN (−20–30% hallucinations) as specific GraphRAG-family systems
