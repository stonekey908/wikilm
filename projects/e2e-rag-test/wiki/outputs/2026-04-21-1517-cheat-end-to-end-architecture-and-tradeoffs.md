---
type: output
output_type: cheat
generated_at: "2026-04-21"
scope: project
project_slug: "e2e-rag-test"
model: "sonnet"
tags: [output, cheat]
---

# End-to-End RAG Architecture and Trade-offs

**One-line summary**: RAG patches frozen LLM knowledge by injecting non-parametric retrieval at inference time — but every design choice (chunking, retrieval strategy, coupling style) introduces its own latency, faithfulness, and robustness trade-offs.

---

## Key Facts

- **Three-phase pipeline**: Indexing (chunk + embed → [[vector-database]]) → Retrieval (embed query → ANN lookup) → Generation (retrieved chunks appended to prompt). See [[retrieval-augmented-generation]].
- **Formal framing**: P(y|x) ≈ Σ P(y|x,dᵢ) · P(dᵢ|x) — generation marginalises over retrieved documents, not just the query. From [[rag-comprehensive-survey-2506-00054]].
- **Two orthogonal taxonomies**: Gupta's evolutionary lens (Naive → Advanced → Modular) vs. Sharma's design-intent lens (Retriever-Centric · Generator-Centric · Hybrid · Robustness-Oriented). Neither supersedes the other. See [[project-overview]].
- **Hybrid coupling wins on hard tasks**: RQ-RAG achieves >800% over raw LLM on HotpotQA [[multi-hop-reasoning]]; SELF-RAG >270% on PopQA. Tightly coupled Hybrid RAG consistently outperforms loosely coupled [[modular-rag]] on complex tasks.
- **Context filtering has outsized ROI**: FILCO cuts hallucinations 64% (+8.6 EM); SEER achieves 9.25× context reduction with +13.5 F1 gain. From [[rag-comprehensive-survey-2506-00054]].
- **Retrieval quality is the dominant bottleneck** (Gupta, Sharma) — generation quality is capped by retrieval quality. Hybrid [[dense-retrieval]] + [[sparse-retrieval]] is current best practice over either alone.
- **[[blinkered-chunk-effect]]**: chunks stripped of surrounding context become opaque or misleading — the central failure mode of plain vanilla RAG, named by [[retrieval-augmented-generation-klesel-wittmann-2025]]. [[raptor]] (hierarchical summary trees) and [[graphrag]] (knowledge-graph retrieval) are the primary architectural responses.
- **Security lags badly**: BadRAG and TrojanRAG corpus-poisoning attacks are well-documented; defensive mitigations remain sparse. See [[adversarial-rag-attacks]].
- **Data governance is a first-class concern** (Klesel & Wittmann, 2025): counterfactual or outdated documents in the knowledge store propagate directly into outputs — data quality is now an AI infrastructure problem, not just a pre-processing step.
- **RAG is cheaper than fine-tuning**: updating a [[vector-database]] requires far fewer compute resources than retraining model weights; this is the primary business justification for choosing RAG over fine-tuning.

---

## Top Quotes

> "RAG combines retrieval mechanisms with generative language models to enhance the accuracy of outputs, addressing key limitations of LLMs."
— [[rag-comprehensive-survey-2410-12837]]

> "Bias and factual errors can be *introduced* through the retrieval step if the underlying corpus contains unreliable or skewed content — RAG is not a silver bullet against inaccuracy."
— [[rag-comprehensive-survey-2410-12837]]

> "The vector database requires far fewer compute resources to create and update [compared to fine-tuning]."
— [[retrieval-augmented-generation-klesel-wittmann-2025]]

> "A segment stripped of its surrounding context may be opaque or misleading — like a single extracted paragraph from a Harry Potter novel, unintelligible without the full novel."
— [[retrieval-augmented-generation-klesel-wittmann-2025]] (paraphrased illustration of the [[blinkered-chunk-effect]])

> "Dynamically calibrated retrieval strategies … noise-aware adversarial defenses … graph-augmented multi-hop reasoning with discourse coherence" [are the primary unresolved frontiers].
— [[rag-comprehensive-survey-2506-00054]]

---

## Core Terms

- **[[retrieval-augmented-generation]]** — augmenting LLM generation with non-parametric retrieval at inference time; eliminates retraining for knowledge updates.
- **[[blinkered-chunk-effect]]** — loss of meaning when a document chunk is retrieved without its surrounding context; central failure mode of plain vanilla RAG.
- **[[chunking]]** — how documents are segmented before indexing; granularity choice controls what context is preserved at retrieval time.
- **[[dense-retrieval]]** — bi-encoder embedding similarity search (semantic); captures meaning but misses exact-match keywords.
- **[[sparse-retrieval]]** — BM25/TF-IDF keyword retrieval; exact-match strength; complementary to dense in hybrid setups.
- **[[modular-rag]]** — fully reconfigurable RAG pipeline; most interpretable and deployable but underperforms tight Hybrid coupling on complex tasks.
- **[[raptor]]** — hierarchical summarisation tree; lets retrieval match at multiple granularities; primary mitigation for [[blinkered-chunk-effect]].
- **[[graphrag]]** — knowledge-graph extraction from source text; enables multi-hop entity relationship traversal invisible to pure vector similarity; reduces hallucinations 18–30%.

---

## Who's Who

- **[[chaitanya-sharma]]** — Author of the 2025 ACM TOIS preprint (arXiv 2506.00054); introduced the four-family design-intent taxonomy.
- **[[shailja-gupta]]**, **[[rajesh-ranjan]]**, **[[surya-narayan-singh]]** — Co-authors of the Oct 2024 survey (arXiv 2410.12837); introduced the Naive/Advanced/Modular evolutionary framing.
- **[[michael-klesel]]** & **[[h-felix-wittmann]]** — Frankfurt UAS researchers; coined the Blinkered Chunk Effect; wrote the BISE 2025 Catchword positioning RAG for IS/business audiences.

---

## What NOT to Confuse

- **Modular RAG ≠ best RAG** — Modular RAG is the most flexible and interpretable architecture, but tightly coupled Hybrid RAG systems consistently outperform it on complex, multi-hop tasks. Modularity optimises for maintainability, not peak performance.
- **RAG ≠ hallucination-proof** — Retrieving from a noisy, biased, or outdated corpus can *introduce* factual errors and amplify bias. Data governance is a prerequisite, not an afterthought.
- **Gupta's and Sharma's taxonomies are not competing** — Naive/Advanced/Modular describes *historical generations*; Retriever-Centric/Generator-Centric/Hybrid/Robustness describes *design intent*. A Modular RAG system in Gupta's terms can simultaneously be Hybrid or Robustness-Oriented in Sharma's.

---

## Links

- [[retrieval-augmented-generation]] — core concept and full four-way taxonomy
- [[project-overview]] — cross-source synthesis with tensions table and knowledge gaps
- [[blinkered-chunk-effect]] — named failure mode of plain vanilla RAG
- [[raptor]] — hierarchical summarisation tree; BCE mitigation
- [[graphrag]] — knowledge-graph RAG; multi-hop reasoning enabler
- [[adversarial-rag-attacks]] — corpus poisoning, BadRAG, TrojanRAG
- [[rag-comprehensive-survey-2506-00054]] — Sharma 2025; performance benchmarks and enhancement findings
- [[rag-comprehensive-survey-2410-12837]] — Gupta et al. 2024; evolutionary taxonomy and deployment challenges
- [[retrieval-augmented-generation-klesel-wittmann-2025]] — Klesel & Wittmann 2025; IS/business perspective and BCE
