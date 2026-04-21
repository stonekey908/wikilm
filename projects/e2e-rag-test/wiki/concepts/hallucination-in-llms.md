---
type: concept
name: "Hallucination in LLMs"
tags: [llm, hallucination, factuality, rag, reliability, nlp]
---

# Hallucination in LLMs

The tendency of large language models to generate plausible-sounding but factually incorrect, fabricated, or unsupported statements. Hallucination is the primary motivating problem for [[retrieval-augmented-generation]] — by grounding generation in retrieved evidence, RAG systems aim to anchor outputs to verifiable sources.

## Root Causes

LLMs store knowledge parametrically in their weights during training. This creates several failure modes:
- **Knowledge staleness** — facts change after the training cutoff
- **Domain gaps** — rare or specialized knowledge is underrepresented in training data
- **Confabulation** — the model generates fluent text that fills in gaps with plausible-sounding fabrications
- **Over-reliance on surface patterns** — models can produce outputs that fit the syntactic context but are factually wrong

## Types (RAGTruth Taxonomy)

The RAGTruth benchmark (~18,000 annotated examples) identifies four hallucination types in the context of RAG generation:
1. **Unsupported statements** — claims not found in retrieved context
2. **Contradicted statements** — claims directly contradicted by retrieved context
3. **Numerical/entity errors** — wrong numbers, names, dates
4. **Fabricated details** — invented specifics with no basis in context or retrieval

## RAG as Mitigation

[[retrieval-augmented-generation]] reduces hallucination by conditioning generation on retrieved documents. Key mitigation mechanisms:
- **SELF-RAG** — critique-generate loop with self-revision; achieves +22–30% precision on ASQA
- **CRAG** — evaluates evidence quality at inference time; reduces retrieval errors 12–18%
- **Structured RAG** — curated corpus retrieval lowers hallucinations 30–40%
- **FILCO context filtering** — removes low-relevance passages before generation; −64% hallucinations
- **KRAGEN knowledge graph integration** — reduces hallucinations 20–30%

## Evaluation

- **RAGTruth** — response- and span-level annotation benchmark
- **FactScore** — used in robustness analysis (Self-CRAG achieves +0.456 improvement on Biography dataset)
- **RGB** — tests counterfactual resistance and negative rejection
- **ARES / RAGAS** — automated frameworks evaluating answer faithfulness and context grounding

## Remaining Challenges

RAG reduces but does not eliminate hallucination:
- Adversarial poisoning ([[adversarial-rag-attacks]]) can actively induce hallucination
- Retrieved documents themselves may contain errors
- Generator can still ignore retrieved context and default to parametric knowledge
- [[multi-hop-reasoning]] tasks require multi-document synthesis where errors compound

## Sources

- [[rag-comprehensive-survey-2506-00054]] — §3.4, §4.4, §6.4 cover hallucination benchmarks and mitigations
- [[retrieval-augmented-generation-klesel-wittmann-2025]] — frames hallucination as the primary business motivation for RAG adoption; notes that data quality in the knowledge store is itself a hallucination risk
- [[rag-comprehensive-survey-2410-12837]] — identifies bias amplification through the retrieval corpus as a secondary hallucination pathway RAG does not fully eliminate; flags ethical concerns alongside factual ones
