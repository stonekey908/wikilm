---
type: synthesis
tags: [rag, llm, retrieval-augmented-generation, hallucination, robustness, nlp, survey, data-governance, is-research]
sources:
  - sources/rag-comprehensive-survey-2506-00054.md
  - sources/rag-comprehensive-survey-2410-12837.md
  - sources/retrieval-augmented-generation-klesel-wittmann-2025.md
---

# Project Overview: RAG State of the Field (2025)

**Three perspectives, one architecture.** This wiki distills three surveys — a 2024 NLP survey ([[rag-comprehensive-survey-2410-12837]]), a 2025 technical preprint ([[rag-comprehensive-survey-2506-00054]]), and a 2025 IS Catchword ([[retrieval-augmented-generation-klesel-wittmann-2025]]) — into a structured map of the RAG landscape.

---

## What RAG Is

[[retrieval-augmented-generation]] patches a core LLM limitation: parametric knowledge is frozen at training, causing [[hallucination-in-llms]], stale answers, and domain blindness. RAG segments documents via [[chunking]], stores embeddings in a [[vector-database]], and retrieves relevant chunks at inference — using [[dense-retrieval]], [[sparse-retrieval]], or [[hybrid-retrieval]] (Reciprocal Rank Fusion, current best practice) — before conditioning generation on them. No retraining required.

---

## Two Taxonomies, One Space

**Gupta et al. (2024) — Three Generations:** [[naive-rag]] → [[advanced-rag]] → [[modular-rag]]. A *historical progression* lens.

**Sharma (2025) — Four Architectural Families:** Retriever-Centric · Generator-Centric · Hybrid · Robustness-Oriented. A *design-intent* lens.

Both are complementary, orthogonal cuts of the same space.

---

## Key Findings

- **Hybrid systems dominate complex tasks** — [[multi-hop-reasoning]] gains 800%+ over raw LLM on HotpotQA (Sharma).
- **Context filtering has outsized ROI** — FILCO cuts hallucinations 64%; SEER achieves 9.25× context reduction with +13.5 F1.
- **[[blinkered-chunk-effect]]** (Klesel & Wittmann) — chunks stripped from document context become semantically opaque. [[raptor]] and [[graphrag]] are the primary mitigations.
- **[[graphrag]]** reduces hallucinations 18–30% and enables [[multi-hop-reasoning]] by capturing entity relationships invisible to vector similarity.

---

## Cross-Source Tensions

| Topic | Sharma (2025) | Gupta (2024) | Klesel & Wittmann (2025) |
|---|---|---|---|
| Primary bottleneck | Retrieval quality | Retrieval quality | Data quality & governance |
| Risk framing | Adversarial poisoning | Bias amplification | Counterfactual/outdated docs |

Key divergence: Gupta warns RAG can *amplify* corpus bias — not a hallucination silver bullet. Sharma is more optimistic about noise-adaptive mitigations (RAAT: +20–30% F1/EM). Neither NLP survey engages with Klesel & Wittmann's data-governance-as-infrastructure framing.

---

## Knowledge Gaps

- **Business impact unmeasured** — no empirical evidence RAG improves organisational performance (Klesel & Wittmann research agenda).
- **Evaluation is shallow** — ARES, RAGAS, RAGTruth referenced but benchmarks don't capture domain-specialised retrieval.
- **Security defenses lag** — [[adversarial-rag-attacks]] documented; mitigations remain sparse.
- **Multi-modal RAG and production perspectives absent** — image/audio retrieval, latency, cost, and index scalability are gaps across all three sources.

---

## Generated Artifacts

Three artifacts produced 2026-04-21 (model: sonnet): [[2026-04-21-1517-cheat-end-to-end-architecture-and-tradeoffs|cheat sheet]], [[2026-04-21-1519-infographic-end-to-end-architecture-and-tradeoffs|infographic]], and [[2026-04-21-1521-deck-end-to-end-architecture-and-tradeoffs|slide deck]] — all covering end-to-end RAG architecture and tradeoffs.
