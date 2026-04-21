---
type: source
title: "A Comprehensive Survey of Retrieval-Augmented Generation (RAG): Evolution, Current Landscape and Future Directions"
author: "Shailja Gupta, Rajesh Ranjan, Surya Narayan Singh"
date: "2024-10-03"
source_file: "raw/arxiv-2410.12837"
tags: [rag, retrieval-augmented-generation, llm, survey, nlp, information-retrieval]
---

# A Comprehensive Survey of RAG: Evolution, Current Landscape and Future Directions

**arXiv:** 2410.12837 · **DOI:** 10.48550/arXiv.2410.12837
**Authors:** [[shailja-gupta]], [[rajesh-ranjan]], [[surya-narayan-singh]]
**Submitted:** October 3, 2024 · **Categories:** cs.CL, cs.AI, cs.IR

## Overview

This survey provides a wide-angle view of the [[retrieval-augmented-generation]] (RAG) field, tracing its development from the original motivation — mitigating [[hallucination-in-llms]] in large language models — through the current state of practice. The paper is structured around three interlocking questions: *what has RAG become architecturally*, *how has retrieval and generation quality improved*, and *where does active research still fall short*.

## Key Takeaways

1. **RAG addresses fundamental LLM limitations.** Large language models generate fluent but sometimes fabricated text because their knowledge is frozen at training time. RAG grounds generation in retrieved, verifiable documents, substantially reducing hallucination and enabling up-to-date answers without model retraining.

2. **Three RAG generations have emerged.** The survey organises the field into [[naive-rag]] (simple retrieve-then-generate), [[advanced-rag]] (pre/post-retrieval optimisations), and [[modular-rag]] (fully reconfigurable component pipelines). Each generation addresses the weaknesses of the previous.

3. **Retrieval quality is the dominant bottleneck.** The survey consistently highlights that generation quality is bounded by retrieval quality. Both [[dense-retrieval]] (embedding-based semantic search) and [[sparse-retrieval]] (keyword/BM25) are discussed; hybrid approaches that combine them represent the current best practice.

4. **Applications span a wide domain surface.** The paper reviews RAG deployments in question answering, document summarisation, knowledge-base dialogue, medical QA, legal document analysis, and code generation, demonstrating breadth beyond NLP research benchmarks.

5. **Unresolved challenges are deployment-oriented.** The authors identify scalability of the retrieval index, bias amplification from noisy corpora, latency under real-time constraints, and ethical/privacy concerns around the retrieved documents as the field's open problems.

6. **Future directions call for tighter evaluation standards.** The survey argues that existing benchmarks (TriviaQA, Natural Questions, HotpotQA) do not fully capture multi-hop, multi-document, or domain-specialised retrieval needs. Robustness evaluations and responsible-AI assessments are flagged as underexplored.

## Important Claims

- RAG combines "retrieval mechanisms with generative language models to enhance the accuracy of outputs, addressing key limitations of LLMs."
- Retrieval efficiency innovations are the most active sub-field within RAG research as of the survey's writing date.
- Scalability challenges intensify as retrieval databases grow; distributed indexing and approximate nearest neighbour (ANN) search are the dominant mitigation strategies.
- Bias and factual errors can be *introduced* through the retrieval step if the underlying corpus contains unreliable or skewed content — RAG is not a silver bullet against inaccuracy.

## Structure of the Paper

The paper is organised into five conceptual sections (with approximately 4 figures):
1. **Introduction & motivation** — LLM limitations that motivated RAG
2. **RAG architecture** — the retrieval–generation integration model
3. **Technological advances** — improvements in retrieval, indexing, and generation quality
4. **Applications and domains** — QA, summarisation, knowledge-based tasks
5. **Challenges & future directions** — scalability, bias, ethics, robustness, evaluation

## Relevance to Other Wiki Pages

- [[retrieval-augmented-generation]] — primary concept surveyed; the source page adds empirical breadth to the concept page
- [[hallucination-in-llms]] — the motivating problem; this paper quantifies the extent to which RAG reduces hallucination
- [[naive-rag]], [[advanced-rag]], [[modular-rag]] — the three paradigm pages map directly to sections 3–4 of this survey
- [[dense-retrieval]], [[sparse-retrieval]] — retrieval technique pages grounded in the survey's technology review
