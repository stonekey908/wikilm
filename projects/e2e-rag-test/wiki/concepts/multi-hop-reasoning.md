---
type: concept
name: "Multi-Hop Reasoning"
tags: [nlp, reasoning, question-answering, rag, multi-hop, knowledge-graphs]
---

# Multi-Hop Reasoning

A class of question answering and reasoning tasks where the correct answer requires chaining together information from multiple distinct sources or reasoning steps — "hops" — rather than finding it in a single document. Multi-hop QA is a key benchmark dimension for [[retrieval-augmented-generation]] systems because it stresses both retrieval completeness and compositional generation.

## Why It's Hard for RAG

Single-pass retrieval often fails on multi-hop questions because:
- The query doesn't directly mention the bridge entity connecting the answer chain
- The relevant documents must be retrieved in sequence, each informed by prior reasoning
- Errors in early hops compound downstream (error propagation)
- Standard dense retrievers optimize for direct semantic similarity, not chain-of-evidence retrieval

## Benchmarks

| Benchmark | Description |
|-----------|-------------|
| **HotpotQA** | Wikipedia-based; requires reasoning over 2 supporting documents; bridge and comparison subtypes |
| **MuSiQue** | Multi-step with explicit decomposition; harder than HotpotQA |
| **2WikiMultihopQA (2Wiki)** | Cross-article multi-hop over Wikipedia; includes bridge, inference, comparison, compositional |
| **MultiHop-RAG** | Linked QA pairs with bridge entities and explicit multi-hop query types |

## RAG System Performance (vs. Raw LLM Baseline)

- **RQ-RAG** — >800% improvement on HotpotQA raw baseline; 275% over retrieval baseline; uses perplexity-driven sub-question decomposition
- **R2AG** — >300% relative improvement on HotpotQA; recursive reranking during generation
- **LQR** — 292% improvement on MuSiQue; hierarchical planning
- **IM-RAG** — +5.3 F1 / +7.2 EM on HotpotQA; "inner monologue" alternating generation and retrieval
- **DRAGIN** — 22–44% over raw LLM; token-level entropy triggers
- **FLAREDirect** — 62% over raw LLM on 2Wiki; proactive anticipation of knowledge needs

## Key Approaches

- **Sub-question decomposition** — break complex query into answerable sub-questions (RQ-RAG, KRAGEN, LQR)
- **Iterative retrieval** — retrieve → generate partial answer → retrieve again (IM-RAG, GenGround)
- **Graph-augmented reasoning** — knowledge graph traversal maintains entity consistency across hops (G-Retriever, MedGraphRAG, Graph RAG)
- **Hierarchical planning** — plan the full reasoning chain before executing (LQR)

## Trend

Retrieval-based frameworks show the most consistent improvements on multi-hop tasks. Generator-only enhancements need complementary retrieval mechanisms to handle complex chains. Hybrid frameworks (iterative retrieval + generation) outperform static single-pass pipelines.

## Open Challenges

- Maintaining discourse coherence across long reasoning chains
- Entity consistency across long-range dependencies
- Scaling to 3+ hop questions without exponential retrieval cost
- Structured subgoal decomposition in open-domain settings

## Sources

- [[rag-comprehensive-survey-2506-00054]] — §5.2 (multi-hop performance), §7.3 (future directions for structured compositionality)
