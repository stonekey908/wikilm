# Wiki Index

> Tip: to link across projects, use `[[project-slug/page-name]]`.

## Sources

- [[rag-comprehensive-survey-2506-00054]] — Comprehensive 2025 survey of RAG architectures, enhancements, and robustness by Chaitanya Sharma (arXiv 2506.00054v1)
- [[rag-comprehensive-survey-2410-12837]] — Gupta, Ranjan & Singh 2024 survey; RAG evolution, Naive/Advanced/Modular RAG paradigms, deployment challenges
- [[retrieval-augmented-generation-klesel-wittmann-2025]] — Klesel & Wittmann BISE 2025 Catchword; introduces RAG to IS community, coins Blinkered Chunk Effect, surveys RAPTOR & GraphRAG extensions
- [[gemini-ping-test]] — Smoke test for Gemini CLI path

## Entities

- [[chaitanya-sharma]] — Independent researcher; author of the 2025 RAG comprehensive survey
- [[shailja-gupta]] — Co-author of 2024 RAG survey (arXiv 2410.12837)
- [[rajesh-ranjan]] — Co-author of 2024 RAG survey (arXiv 2410.12837)
- [[surya-narayan-singh]] — Co-author of 2024 RAG survey (arXiv 2410.12837)
- [[michael-klesel]] — Researcher at Frankfurt UAS; co-author of BISE RAG Catchword; coined Blinkered Chunk Effect
- [[h-felix-wittmann]] — Researcher at Frankfurt UAS; co-author of BISE RAG Catchword

## Concepts

- [[retrieval-augmented-generation]] — Framework augmenting LLMs with non-parametric retrieval at inference time; four-way architectural taxonomy
- [[hallucination-in-llms]] — LLM tendency to generate factually incorrect statements; primary problem RAG addresses
- [[multi-hop-reasoning]] — QA tasks requiring chaining evidence across multiple documents; key RAG benchmark dimension
- [[adversarial-rag-attacks]] — Corpus poisoning and embedding-level backdoor attacks on RAG retrieval pipelines
- [[naive-rag]] — Plain retrieve-then-generate RAG; simplest paradigm; baseline for comparisons
- [[advanced-rag]] — Pre/post-retrieval optimisation extensions to naive RAG
- [[modular-rag]] — Fully reconfigurable component pipeline for RAG; most flexible paradigm
- [[dense-retrieval]] — Embedding-based semantic retrieval; bi-encoder architecture
- [[sparse-retrieval]] — Keyword/BM25-based retrieval; complements dense retrieval in hybrid setups
- [[hybrid-retrieval]] — Combines dense + sparse retrieval via Reciprocal Rank Fusion; current best practice in production RAG
- [[blinkered-chunk-effect]] — Loss of meaning when chunks are stripped from surrounding document context; central plain-vanilla RAG failure mode (Klesel & Wittmann)
- [[chunking]] — Document segmentation strategy for RAG indexing; determines granularity and context at retrieval
- [[vector-database]] — Non-parametric memory store for RAG; holds chunk embeddings; lower-cost alternative to fine-tuning
- [[raptor]] — RAG extension; hierarchical summarisation tree for multi-granularity retrieval; mitigates Blinkered Chunk Effect
- [[graphrag]] — RAG extension; knowledge graph extraction for relationship-aware and multi-hop retrieval

## Comparisons

## Synthesis

- [[project-overview]] — Big-picture synthesis: RAG taxonomy, key findings, design tensions, and knowledge gaps as of 2025

## Queries

## Outputs

- [[2026-04-21-1517-cheat-end-to-end-architecture-and-tradeoffs]] — Cheat sheet: end-to-end RAG architecture and tradeoffs (generated 2026-04-21, sonnet)
- [[2026-04-21-1519-infographic-end-to-end-architecture-and-tradeoffs]] — Infographic: end-to-end RAG architecture and tradeoffs (generated 2026-04-21, sonnet)
- [[2026-04-21-1521-deck-end-to-end-architecture-and-tradeoffs]] — Slide deck: end-to-end RAG architecture and tradeoffs (generated 2026-04-21, sonnet)
