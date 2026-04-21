---
type: concept
name: "Retrieval-Augmented Generation"
aliases: ["RAG"]
tags: [rag, llm, nlp, retrieval, generation, grounding, architecture]
---

# Retrieval-Augmented Generation (RAG)

A framework for enhancing large language models (LLMs) by retrieving external evidence at inference time rather than relying solely on parametric knowledge frozen during training. RAG systems are the primary response to [[hallucination-in-llms]] and knowledge staleness in LLMs.

## Core Formulation

The fundamental equation decomposes the conditional generation probability over retrieved documents:

> **P(y|x) ≈ Σ P(y|x,dᵢ) · P(dᵢ|x)**

- **x** = input query
- **dᵢ** = retrieved document (top-k approximation of full corpus)
- **y** = generated response

## System Components

1. **Query Encoder** — transforms input into a query representation (neural or rule-based)
2. **Retriever** — fetches ranked documents from a corpus (sparse BM25, dense bi-encoder, hybrid, or generative variants)
3. **Generator** — conditions on query + retrieved documents to produce output (typically transformer-based: T5, BART, GPT-family)

## Architectural Taxonomy

As of mid-2025, RAG systems fall into four major architectural categories (see [[rag-comprehensive-survey-2506-00054]]):

### Retriever-Centric
Delegates innovation to the retriever; generator is a passive decoder. Key systems: RQ-RAG (sub-question decomposition), RAG-Fusion (reciprocal rank fusion), SimRAG (self-training for domain generalization), SEER (faithfulness-aligned evidence selection), LongRAG (compressed long-context chunks).

### Generator-Centric
Concentrates innovation on decoding. Key systems: SELF-RAG (critique-generate loop with self-revision), FiD-Light (encoder compression for efficiency), xRAG (document embeddings projected into representation space).

### Hybrid
Tightly couples retriever and generator as co-adaptive agents. Key systems: IM-RAG ("inner monologue" iterative retrieval), DRAGIN/FLARE (entropy- and confidence-triggered retrieval), CRAG (evidence quality evaluation), Stochastic RAG (REINFORCE gradient optimization), M-RAG (multi-agent RL).

### Robustness & Security-Oriented
Preserves quality under noisy or adversarially manipulated retrieval. See [[adversarial-rag-attacks]]. Key systems: RAAT (adversarial pretraining), RAGTruth (hallucination benchmark), Bottleneck Noise Filtering.

## Key Enhancement Families

- **Adaptive retrieval** — trigger retrieval only when needed (DRAGIN, FLARE, TA-ARE reduce redundant retrievals by ~15%)
- **Context filtering** — remove irrelevant passages before generation (FILCO: −64% hallucinations, +8.6 EM; SEER: 9.25× context reduction)
- **Inference efficiency** — caching (RAGCache), speculative pipelining (−20–30% TTFT), token compression (FiD-Light)
- **Knowledge graph integration** — Dual-Pathway KG-RAG reduces hallucinations 18%; KRAGEN reduces hallucinations 20–30%

## Performance Highlights

RAG consistently outperforms raw LLM baselines on factual QA:
- Short-form QA (PopQA): SELF-RAG >270%, Self-CRAG 320% over raw LLM
- [[multi-hop-reasoning]] (HotpotQA): RQ-RAG >800%, IM-RAG +5.3 F1 / +7.2 EM
- Robustness (Biography FactScore): Self-CRAG +0.456 (best result)

## Core Design Tensions

1. **Retrieval precision vs. generation flexibility** — tighter retrieval constrains output expressiveness
2. **Efficiency vs. faithfulness** — compression and caching can sacrifice grounding
3. **Modularity vs. coordination** — modular designs are interpretable but underperform tightly coupled systems on complex tasks

## Evaluation Frameworks

- **ARES** — LLM-as-judge; outperforms RAGAS by 59.3pp on context relevance
- **RAGAS** — atomic factual statement decomposition
- **RAGTruth** — ~18,000 annotated examples for [[hallucination-in-llms]] detection
- **RGB** — noise robustness, negative rejection, counterfactual resistance
- **MIRAGE** — medical domain (7,663 questions)

## Open Challenges

- Cross-domain generalization and temporal drift (recency-aware scoring)
- Robust defense against [[adversarial-rag-attacks]]
- Explainability and trust calibration for retrieval decisions
- Scaling [[multi-hop-reasoning]] with structured compositionality

## Business IS Perspective

[[retrieval-augmented-generation-klesel-wittmann-2025]] (Klesel & Wittmann, BISE 2025) introduces RAG to the IS community, coins the [[blinkered-chunk-effect]] as the central failure mode of plain vanilla RAG, and proposes a research agenda covering Data Mesh, fine-tuning trade-offs, and IT–business alignment. It surveys [[raptor]] and [[graphrag]] as the primary architectural responses to the BCE.

## Evolutionary Taxonomy (2024)

The Gupta et al. survey ([[rag-comprehensive-survey-2410-12837]]) organises RAG history into three generations, providing historical context for the architectural diversity in the 2025 taxonomy above:

- **[[naive-rag]]** — baseline retrieve-then-generate pipeline (2020–2022 era)
- **[[advanced-rag]]** — pre/post-retrieval optimisations: query rewriting, HyDE, reranking, compression (2022–2023)
- **[[modular-rag]]** — fully reconfigurable component-based pipelines (2023–present)

## Retrieval Technique Variants

- **[[dense-retrieval]]** — embedding-based semantic similarity; dominant approach in production RAG
- **[[sparse-retrieval]]** — BM25/TF-IDF keyword matching; fast and precise for exact lexical terms
- **Hybrid** — combines dense and sparse scores; consistently outperforms either alone

## Sources

- [[rag-comprehensive-survey-2506-00054]] — comprehensive 2025 survey; four-way architectural taxonomy with comparative benchmarks
- [[rag-comprehensive-survey-2410-12837]] — evolutionary survey (Oct 2024); traces Naive → Advanced → Modular progression; applications and deployment challenges
- [[retrieval-augmented-generation-klesel-wittmann-2025]] — BISE Catchword; IS research framing, BCE concept, and RAG extensions overview
