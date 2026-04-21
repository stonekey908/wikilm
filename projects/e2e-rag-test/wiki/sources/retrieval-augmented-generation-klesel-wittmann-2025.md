---
type: source
title: "Retrieval-Augmented Generation (RAG)"
author: "Michael Klesel, H. Felix Wittmann"
date: "2025-08-01"
source_file: "https://link.springer.com/article/10.1007/s12599-025-00945-3"
tags: [rag, llm, ai, information-retrieval, knowledge-management, bise]
---

# Retrieval-Augmented Generation (RAG)

**Authors:** [[michael-klesel]] and [[h-felix-wittmann]] (Frankfurt University of Applied Sciences)
**Journal:** Business & Information Systems Engineering (BISE), Vol. 67, Issue 4, pp. 551–561
**DOI:** 10.1007/s12599-025-00945-3
**Article type:** Catchword (concept introduction)
**Keywords:** Retrieval-augmented generation, Artificial intelligence, Large language models, Information retrieval

## Overview

This "Catchword" article introduces [[retrieval-augmented-generation]] (RAG) to the BISE community. It describes the fundamental RAG architecture, explains its business relevance, surveys key architectural extensions, and proposes a research agenda for IS scholars.

The core motivation: large language models (LLMs) are powerful but prone to [[hallucination-in-llms|hallucination]] and lack access to current or private organisational data. RAG addresses both problems by grounding generation in a separately maintained knowledge store, without the cost of full fine-tuning.

## Plain Vanilla RAG Architecture

RAG combines two memory types:

- **Parametric memory** — the pretrained LLM (weights encode world knowledge learned during training)
- **Non-parametric memory** — an external database (organisational documents, real-time data)

The pipeline has three phases:

1. **Indexing** — documents are split into chunks and converted to vector embeddings stored in a [[vector-database]]
2. **Retrieval** — at query time, the query is embedded and semantically similar chunks are retrieved
3. **Generation** — retrieved chunks are appended to the prompt as context; the LLM generates a grounded response

Key advantage over fine-tuning: the [[vector-database]] requires far fewer compute resources to create and update.

## The Blinkered Chunk Effect

The authors introduce the **[[blinkered-chunk-effect]]** (BCE) as a central limitation of plain vanilla RAG. The [[chunking]] process extracts segments from documents, but a segment stripped of its surrounding context may be opaque or misleading — illustrated with a Harry Potter analogy: a single extracted paragraph is unintelligible without having read the full novel. This problem intensifies for jargon-heavy business documents.

## RAG Extensions

The paper surveys architectural extensions that address limitations of plain vanilla RAG:

### RAPTOR
[[raptor]] (Recursive Abstractive Processing for Tree-Organised Retrieval) clusters and recursively summarises chunks, building a hierarchical tree of summaries. Querying at different levels of the tree lets the system match retrieval granularity to query type, directly mitigating the BCE.

### GraphRAG
[[graphrag]] extracts a knowledge graph from source text, organising entities and relationships into a hierarchy. Graph-based retrieval enables multi-hop reasoning and captures relationships invisible to pure vector-similarity search.

### Other Extensions
The paper also notes agentic RAG patterns — compositions where an LLM orchestrates multiple retrieval steps — and hybrid dense/sparse retrieval as further avenues.

## Data Quality Challenges

RAG shifts the quality bottleneck from model weights to the knowledge store. Key challenges:
- Counterfactual or outdated documents propagate errors into outputs
- Significant data management effort required before indexing
- Data governance and curation become first-class AI infrastructure concerns

## Research Agenda

The authors pose open research questions for the IS community:

1. Do high levels of data management capability (e.g., Data Mesh incorporating RAG) lead to measurably higher organisational performance?
2. What is the optimal balance between data included in RAG versus data baked into fine-tuning for a given task?
3. To what extent does a RAG-based architecture contribute to better IT–business alignment?

## Key Takeaways

- RAG is a practical, lower-cost alternative to fine-tuning for grounding LLMs in organisational knowledge
- The [[blinkered-chunk-effect]] is the primary failure mode of plain vanilla RAG; [[raptor]] and [[graphrag]] are the main architectural responses
- Data quality and governance are now central to AI system quality in RAG deployments
- IS researchers have significant open territory: performance impacts, fine-tuning trade-offs, and alignment effects remain empirically underexplored

## Relevance to Other Wiki Pages

- [[retrieval-augmented-generation]] — the architecture this source introduces
- [[blinkered-chunk-effect]] — concept coined in this paper
- [[hallucination-in-llms]] — the core problem RAG mitigates
- [[vector-database]] — the non-parametric memory store at the heart of RAG
- [[chunking]] — the indexing technique whose limitations motivate the BCE
- [[graphrag]] — a major RAG extension surveyed
- [[raptor]] — the other major RAG extension surveyed
