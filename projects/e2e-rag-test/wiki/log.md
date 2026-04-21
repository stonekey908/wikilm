# Wiki Log

## [2026-04-21] update | Synthesis — project-overview.md trimmed to <500 words

Condensed body from ~534 to ~451 words while preserving all framing. Cuts: removed "The sources carve up the same field differently:" intro sentence; collapsed "orthogonal cuts" elaboration to one line; dropped two sub-bullets (Modularity/interpretability trade-off; DRAGIN/FLARE ~15% pruning); merged Multi-modal RAG + No production perspective into one gap bullet; simplified business-impact wording. All 15 concept wikilinks, 3 source wikilinks, and 3 output artifact links intact.

---

## [2026-04-21] ingest | Gemini ping test — raw/gemini-ping-test.md

Ingested: Gemini ping test (smoke test for Gemini CLI path).

Pages created (1):
- `wiki/sources/gemini-ping-test.md` — source summary for connectivity and path verification test.

Index and log updated.

---

## [2026-04-21] update | Synthesis — project-overview.md refined (fixed self-referential output links)

Audited all concept, entity, and output wikilinks against the current index. All 15 concepts, 3 sources, and 3 output pages present and linked. Fixed Generated Artifacts section: replaced broken `[[project-overview|index]]` self-link with direct wikilinks to the three output pages (cheat sheet, infographic, slide deck). No structural changes; word count within 500-word limit.

---

## [2026-04-21] update | Synthesis — project-overview.md refreshed (trimmed to <500 words; generated artifacts noted)

Reviewed all 15 concept and 3 source wikilinks — all already present. Trimmed ~30 words of redundant prose to bring body under 500-word limit. Added "Generated Artifacts" section noting the cheat sheet, infographic, and deck produced on 2026-04-21. No structural changes; all prior framing preserved.

---

## [2026-04-21] update | Synthesis — project-overview.md refined (hybrid-retrieval wired; outputs indexed)

Wired [[hybrid-retrieval]] into the synthesis body (previously linked only to dense/sparse, missing the hybrid concept page created by the lint pass). Updated `wiki/index.md` to list the three generated outputs (cheat sheet, infographic, deck — all 2026-04-21, sonnet). No structural changes to synthesis; word count within 500-word body limit.

---

## [2026-04-21] lint | Fix #108 — created hybrid-retrieval concept page

Created `wiki/concepts/hybrid-retrieval.md` covering Reciprocal Rank Fusion, fusion alternatives, infrastructure requirements, and use cases. Added `[[hybrid-retrieval]]` wikilinks in `dense-retrieval.md` and `sparse-retrieval.md`. Added entry to `wiki/index.md`.

---

## [2026-04-21] update | Generated output: deck (project) | model: sonnet

---

## [2026-04-21] update | Generated output: infographic (project) | model: sonnet

---

## [2026-04-21] update | Generated output: cheat (project) | model: sonnet

---

## [2026-04-21] update | Synthesis — project-overview.md refined (retrieval stack concepts wired)

Refined `wiki/synthesis/project-overview.md` to link all orphaned wiki concepts into the synthesis body. Added [[chunking]], [[vector-database]], [[dense-retrieval]], and [[sparse-retrieval]] to the "What RAG Is" section, describing the full retrieval stack pipeline. Minor wording trim in Key Findings to stay within 500-word body limit. No structural changes; all prior framing preserved.

---

## [2026-04-21] ingest | Retrieval-Augmented Generation (RAG) — Klesel & Wittmann, BISE 2025

Ingested: "Retrieval-Augmented Generation (RAG)" by Michael Klesel and H. Felix Wittmann (Frankfurt University of Applied Sciences). BISE Catchword article, Vol. 67(4), pp. 551–561. DOI: 10.1007/s12599-025-00945-3.

**Distinctive contribution vs. prior sources:** This is the only practitioner/IS-audience article in the wiki (vs. technical NLP surveys). Its distinctive contributions are: (1) naming the *Blinkered Chunk Effect* as the central failure mode of plain vanilla RAG; (2) positioning vector databases vs. fine-tuning trade-offs as a business decision; (3) surfacing a concrete IS research agenda (Data Mesh + RAG, optimal fine-tune balance, IT-business alignment).

Pages created (8):
- `wiki/sources/retrieval-augmented-generation-klesel-wittmann-2025.md` — source summary with RAG pipeline, BCE concept, RAPTOR/GraphRAG extensions, IS research agenda
- `wiki/entities/michael-klesel.md` — co-author entity; coined Blinkered Chunk Effect
- `wiki/entities/h-felix-wittmann.md` — co-author entity
- `wiki/concepts/blinkered-chunk-effect.md` — new concept coined in this paper; context loss during RAG chunking
- `wiki/concepts/chunking.md` — document segmentation strategies for RAG indexing
- `wiki/concepts/vector-database.md` — non-parametric memory store; embeddings; lower-cost vs fine-tuning
- `wiki/concepts/raptor.md` — hierarchical summarisation tree; mitigates BCE
- `wiki/concepts/graphrag.md` — knowledge graph extraction for relationship-aware retrieval; multi-hop reasoning

Pages updated (2):
- `wiki/concepts/retrieval-augmented-generation.md` — added Business IS Perspective section with BCE, RAPTOR, GraphRAG; added IS research questions
- `wiki/concepts/hallucination-in-llms.md` — added cross-reference noting data quality in knowledge store as secondary hallucination risk

Index updated with all new pages and previously unlisted pages.

---

## [2026-04-21] ingest | RAG Comprehensive Survey — arXiv 2410.12837 (Gupta, Ranjan & Singh, Oct 2024)

Ingested: "A Comprehensive Survey of Retrieval-Augmented Generation (RAG): Evolution, Current Landscape and Future Directions" by Shailja Gupta, Rajesh Ranjan, and Surya Narayan Singh. arXiv:2410.12837, October 3 2024. Categories: cs.CL, cs.AI, cs.IR.

**Distinctive contribution vs. prior sources:** This is the earliest survey in the wiki (Oct 2024 vs Jun 2025 for Sharma). Its primary contribution is the *evolutionary taxonomy* — Naive RAG → Advanced RAG → Modular RAG — which describes the historical development of the field rather than a synchronic architectural taxonomy. Also emphasises deployment concerns (scalability, bias, ethics) and domain applications (medical, legal, code) more explicitly than the 2506 survey.

Pages created (8):
- `wiki/sources/rag-comprehensive-survey-2410-12837.md` — source summary with key takeaways, claims, and paper structure
- `wiki/entities/shailja-gupta.md` — author entity
- `wiki/entities/rajesh-ranjan.md` — author entity
- `wiki/entities/surya-narayan-singh.md` — author entity
- `wiki/concepts/naive-rag.md` — baseline retrieve-then-generate pipeline; strengths/limitations; motivates Advanced RAG
- `wiki/concepts/advanced-rag.md` — pre/post-retrieval optimisations (HyDE, query rewriting, reranking, compression)
- `wiki/concepts/modular-rag.md` — reconfigurable component pipeline; module taxonomy; relationship to Agentic RAG
- `wiki/concepts/dense-retrieval.md` — embedding-based semantic retrieval; encoders, ANN, comparison with sparse
- `wiki/concepts/sparse-retrieval.md` — BM25/TF-IDF keyword retrieval; hybrid combination with dense

Pages updated (2):
- `wiki/concepts/retrieval-augmented-generation.md` — added evolutionary taxonomy section (Naive/Advanced/Modular) + retrieval technique variants (dense/sparse)
- `wiki/concepts/hallucination-in-llms.md` — added source reference noting bias amplification as a secondary hallucination pathway

Index: already current (prior ingest had pre-populated new concept and entity stubs).

---

## [2026-04-21] update | Synthesis — project-overview.md refreshed (3-source update)

Updated `wiki/synthesis/project-overview.md` to reflect all three ingested sources. Key additions: (1) dual-taxonomy section contrasting Gupta's three-generation model (Naive/Advanced/Modular) with Sharma's four-family design-intent taxonomy — framed as orthogonal, not contradictory; (2) cross-source tensions table surfacing disagreements on primary bottleneck (retrieval quality vs. data governance) and risk framing (bias amplification vs. adversarial poisoning); (3) Blinkered Chunk Effect integrated as a named failure mode with RAPTOR/GraphRAG as mitigations; (4) knowledge gaps expanded to include unmeasured business impact (Klesel & Wittmann research agenda) and production/ops blindspot across all three surveys. Word count within 500-word body limit. Sources list updated to all three source files.

---

## [2026-04-21] update | Synthesis — project-overview.md created

Created `wiki/synthesis/project-overview.md`: big-picture synthesis covering the four-way RAG taxonomy, key enhancement findings, intra-paper design tensions, and knowledge gaps (no multi-modal coverage, no practitioner perspective, thin adversarial defenses). Single source wiki — no inter-source contradictions yet. Index updated with synthesis entry.

---

## [2026-04-21] ingest | RAG Comprehensive Survey (arXiv 2506.00054v1)

Ingested: "Retrieval-Augmented Generation: A Comprehensive Survey of Architectures, Enhancements, and Robustness Frontiers" by Chaitanya Sharma. Preprint under review at ACM TOIS.

Pages created (6):
- `wiki/sources/rag-comprehensive-survey-2506-00054.md` — source summary with taxonomy, performance tables, key findings
- `wiki/entities/chaitanya-sharma.md` — author entity
- `wiki/concepts/retrieval-augmented-generation.md` — core RAG concept, four-way taxonomy, enhancements, evaluation frameworks
- `wiki/concepts/hallucination-in-llms.md` — hallucination types, RAG mitigations, evaluation benchmarks
- `wiki/concepts/multi-hop-reasoning.md` — multi-hop QA benchmarks, RAG performance, key approaches
- `wiki/concepts/adversarial-rag-attacks.md` — BadRAG, TrojanRAG, corpus poisoning, defenses

Index and log updated.
