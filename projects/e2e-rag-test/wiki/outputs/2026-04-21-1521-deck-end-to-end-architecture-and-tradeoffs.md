---
marp: true
theme: gaia
paginate: true
backgroundColor: '#0f0e0c'
color: '#f5f0e6'
style: |
  section {
    font-family: 'Georgia', 'Fraunces', serif;
    background: linear-gradient(135deg, #0f0e0c 0%, #1a1815 60%, #2a2420 100%);
    padding: 72px 88px;
  }
  section.lead {
    background: linear-gradient(135deg, #b91c1c 0%, #0f0e0c 100%);
    text-align: left;
  }
  h1 { font-size: 64px; font-weight: 300; letter-spacing: -0.03em; line-height: 1.05; margin-bottom: 28px; }
  h2 { font-size: 42px; font-weight: 400; letter-spacing: -0.02em; border-left: 4px solid #b91c1c; padding-left: 22px; margin-bottom: 24px; }
  h3 { font-size: 26px; color: #d4c59a; font-style: italic; }
  p, li { font-size: 26px; line-height: 1.5; }
  li { margin-bottom: 8px; }
  em { color: #f7e98c; font-style: italic; }
  strong { color: #f5f0e6; font-weight: 600; }
  code { background: rgba(245,240,230,0.12); padding: 2px 8px; }
  footer { color: #8a8377; font-size: 16px; letter-spacing: 0.08em; text-transform: uppercase; }
  section::after { color: #8a8377; }
  .kicker { display: block; font-size: 18px; letter-spacing: 0.18em; text-transform: uppercase; color: #d4c59a; margin-bottom: 16px; }
header: ''
footer: 'WikiLM · e2e-rag-test'
output_type: deck
scope: project
project_slug: e2e-rag-test
model: sonnet
generated_at: '2026-04-21T15:21:46.869Z'
---

<!-- _class: lead -->

# End-to-End RAG Architecture & Tradeoffs

### What three 2024–2025 surveys agree on — and where they diverge

---

<p class="kicker">§ 01 · The Story in Five Points</p>

## One-Slide Summary

- **RAG patches LLM memory** — retrieves external evidence at inference; no retraining needed
- **Three paradigms describe the evolution:** Naive → Advanced → Modular RAG
- **Four design families describe intent:** Retriever-Centric · Generator-Centric · Hybrid · Robustness
- **The Blinkered Chunk Effect** is the central failure of plain retrieval; GraphRAG and RAPTOR fix it
- **Security and data governance are the unsolved frontiers** — defenses lag far behind attacks

---

<p class="kicker">§ 02 · Pipeline</p>

## The End-to-End RAG Pipeline

<svg viewBox="0 0 800 180" width="100%">
  <!-- Stage boxes -->
  <rect x="10" y="60" width="130" height="60" rx="8" fill="#1a1815" stroke="#b91c1c" stroke-width="2"/>
  <text x="75" y="87" text-anchor="middle" fill="#f5f0e6" font-size="15" font-family="Georgia">Source Docs</text>
  <text x="75" y="107" text-anchor="middle" fill="#d4c59a" font-size="13" font-family="Georgia">chunk + embed</text>

  <rect x="180" y="60" width="130" height="60" rx="8" fill="#1a1815" stroke="#b91c1c" stroke-width="2"/>
  <text x="245" y="87" text-anchor="middle" fill="#f5f0e6" font-size="15" font-family="Georgia">Vector Store</text>
  <text x="245" y="107" text-anchor="middle" fill="#d4c59a" font-size="13" font-family="Georgia">ANN index</text>

  <rect x="350" y="60" width="130" height="60" rx="8" fill="#1a1815" stroke="#b91c1c" stroke-width="2"/>
  <text x="415" y="87" text-anchor="middle" fill="#f5f0e6" font-size="15" font-family="Georgia">Retriever</text>
  <text x="415" y="107" text-anchor="middle" fill="#d4c59a" font-size="13" font-family="Georgia">dense · sparse · hybrid</text>

  <rect x="520" y="60" width="130" height="60" rx="8" fill="#1a1815" stroke="#b91c1c" stroke-width="2"/>
  <text x="585" y="87" text-anchor="middle" fill="#f5f0e6" font-size="15" font-family="Georgia">Generator</text>
  <text x="585" y="107" text-anchor="middle" fill="#d4c59a" font-size="13" font-family="Georgia">context + query → y</text>

  <rect x="690" y="60" width="100" height="60" rx="8" fill="#2a2420" stroke="#d4c59a" stroke-width="2"/>
  <text x="740" y="87" text-anchor="middle" fill="#f7e98c" font-size="15" font-family="Georgia">Response</text>
  <text x="740" y="107" text-anchor="middle" fill="#d4c59a" font-size="13" font-family="Georgia">grounded</text>

  <!-- Arrows -->
  <line x1="140" y1="90" x2="178" y2="90" stroke="#8a8377" stroke-width="2" marker-end="url(#arr)"/>
  <line x1="310" y1="90" x2="348" y2="90" stroke="#8a8377" stroke-width="2" marker-end="url(#arr)"/>
  <line x1="480" y1="90" x2="518" y2="90" stroke="#8a8377" stroke-width="2" marker-end="url(#arr)"/>
  <line x1="650" y1="90" x2="688" y2="90" stroke="#8a8377" stroke-width="2" marker-end="url(#arr)"/>

  <!-- User query arc -->
  <path d="M415 60 Q415 20 585 60" fill="none" stroke="#f7e98c" stroke-width="1.5" stroke-dasharray="5,4"/>
  <text x="500" y="18" text-anchor="middle" fill="#f7e98c" font-size="13" font-family="Georgia">user query</text>

  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#8a8377"/>
    </marker>
  </defs>
</svg>

- **P(y|x) ≈ Σ P(y|x,dᵢ) · P(dᵢ|x)** — generation conditioned on retrieved chunks
- Hybrid retrieval (dense + sparse) consistently outperforms either alone
- No model retraining required; cost scales with index size, not parameters

*[[retrieval-augmented-generation]]*

---

<p class="kicker">§ 03 · Evolution</p>

## Three Generations of RAG

| Generation | Era | Core Idea | Weakness |
|---|---|---|---|
| **Naive RAG** | 2020–22 | retrieve → generate, fixed pipeline | context loss, noise sensitivity |
| **Advanced RAG** | 2022–23 | query rewriting, HyDE, reranking, compression | pipeline complexity |
| **Modular RAG** | 2023– | fully reconfigurable components, agent loops | coordination overhead |

- Modularity trades *peak benchmark performance* for *interpretability and deployment ease*
- Agentic RAG (iterative retrieval loops) emerges from Modular RAG as its most complex form

*[[naive-rag]] · [[advanced-rag]] · [[modular-rag]]*

---

<p class="kicker">§ 04 · Design Families</p>

## Four Architectural Intents (Sharma 2025)

- **Retriever-Centric** — RQ-RAG, RAG-Fusion, SEER: innovate at retrieval; generator is passive
- **Generator-Centric** — SELF-RAG, FiD-Light: innovate at decoding; retriever is fixed
- **Hybrid** — DRAGIN, CRAG, IM-RAG: retriever and generator co-adapt at inference time
- **Robustness-Oriented** — RAAT, Bottleneck Filtering: harden against noisy or poisoned context

### *The two taxonomies are orthogonal, not contradictory*

A Modular RAG system can be Hybrid or Robustness-Oriented in intent.

*[[rag-comprehensive-survey-2506-00054]]*

---

<p class="kicker">§ 05 · Key Failure Mode</p>

## The Blinkered Chunk Effect

> *"A retrieved chunk is right by similarity — but wrong in context."*

- **Plain chunking strips surrounding document meaning** from the retrieved fragment
- *Heavy casualties:* contracts, specs, co-referential knowledge bases, multi-step procedures
- The LLM sees the correct words but cannot reconstruct what came before or after

**Architectural mitigations:**

| Fix | Mechanism |
|---|---|
| **RAPTOR** | Hierarchical summary tree — retrieval at the right abstraction level |
| **GraphRAG** | Knowledge graph — entity relationships supply context chunk boundaries erase |
| Sliding-window chunks | Overlap preserves local continuity |

*[[blinkered-chunk-effect]] · [[raptor]] · [[graphrag]]*

---

<p class="kicker">§ 06 · Performance Numbers</p>

## What RAG Actually Delivers

- **Multi-hop QA (HotpotQA):** RQ-RAG >*800%* over raw LLM; IM-RAG +5.3 F1
- **Short-form QA (PopQA):** SELF-RAG >270%; Self-CRAG *320%* over raw LLM
- **Hallucination reduction:** FILCO −*64%* hallucinations; SEER *9.25×* context reduction with +13.5 F1
- **Knowledge-graph RAG:** KRAGEN −*20–30%* hallucinations vs. text-only RAG
- **Adaptive retrieval:** DRAGIN/FLARE prune ~*15%* redundant fetches with no accuracy loss

### *Gains compound: hybrid retrieval + context filtering is the dominant production pattern*

*[[retrieval-augmented-generation]] · [[multi-hop-reasoning]]*

---

<p class="kicker">§ 07 · Security</p>

## Adversarial Threats — A Growing Attack Surface

- **BadRAG (corpus poisoning):** *98.2% attack success rate* with only *0.04% corpus corruption*
- **TrojanRAG:** embedding-level backdoors invisible to content-layer sanitization
- RAG introduces a runtime dependency on *external, potentially untrusted content* — bypassing model-level RLHF defenses
- Best current defense (RAAT adversarial pretraining): +20–30% F1/EM on noisy inputs
- **No system fully defends against high-precision BadRAG-style triggers today**

### *Small corpus compromise → large, reliable output control*

*[[adversarial-rag-attacks]]*

---

<p class="kicker">§ 08 · Tensions</p>

## Three Fundamental Design Tradeoffs

<svg viewBox="0 0 800 200" width="100%">
  <!-- Tension 1 -->
  <rect x="10" y="30" width="240" height="140" rx="10" fill="#1a1815" stroke="#b91c1c" stroke-width="2"/>
  <text x="130" y="62" text-anchor="middle" fill="#f7e98c" font-size="16" font-family="Georgia" font-weight="bold">Precision vs. Flexibility</text>
  <text x="130" y="90" text-anchor="middle" fill="#d4c59a" font-size="14" font-family="Georgia">Tighter retrieval</text>
  <text x="130" y="110" text-anchor="middle" fill="#d4c59a" font-size="14" font-family="Georgia">→ less generative range</text>
  <text x="130" y="150" text-anchor="middle" fill="#8a8377" font-size="13" font-family="Georgia">factuality ↔ creativity</text>

  <!-- Tension 2 -->
  <rect x="280" y="30" width="240" height="140" rx="10" fill="#1a1815" stroke="#b91c1c" stroke-width="2"/>
  <text x="400" y="62" text-anchor="middle" fill="#f7e98c" font-size="16" font-family="Georgia" font-weight="bold">Efficiency vs. Faithfulness</text>
  <text x="400" y="90" text-anchor="middle" fill="#d4c59a" font-size="14" font-family="Georgia">Caching + compression</text>
  <text x="400" y="110" text-anchor="middle" fill="#d4c59a" font-size="14" font-family="Georgia">→ can sacrifice grounding</text>
  <text x="400" y="150" text-anchor="middle" fill="#8a8377" font-size="13" font-family="Georgia">latency ↔ accuracy</text>

  <!-- Tension 3 -->
  <rect x="550" y="30" width="240" height="140" rx="10" fill="#1a1815" stroke="#b91c1c" stroke-width="2"/>
  <text x="670" y="62" text-anchor="middle" fill="#f7e98c" font-size="16" font-family="Georgia" font-weight="bold">Modularity vs. Coordination</text>
  <text x="670" y="90" text-anchor="middle" fill="#d4c59a" font-size="14" font-family="Georgia">Reconfigurable pipelines</text>
  <text x="670" y="110" text-anchor="middle" fill="#d4c59a" font-size="14" font-family="Georgia">→ underperform on complex QA</text>
  <text x="670" y="150" text-anchor="middle" fill="#8a8377" font-size="13" font-family="Georgia">interpretability ↔ performance</text>
</svg>

*[[retrieval-augmented-generation]] · [[modular-rag]]*

---

<p class="kicker">§ 09 · What's Next</p>

## Open Questions & Next Steps

- **Measure business impact** — does RAG lift organisational performance or IT–business alignment? No empirical data yet
- **Harden security defenses** — BadRAG attacks are documented; robust corpus-integrity verification does not yet exist
- **Multi-modal RAG** — image, audio, video retrieval flagged as future work across all three surveys; no coverage today
- **Production benchmarks** — latency, cost, index scalability at real-world scale are gaps in all surveyed literature
- **Evaluation depth** — ARES, RAGAS, RAGTruth need domain-specialised and multi-document retrieval stress tests

*[[adversarial-rag-attacks]] · [[retrieval-augmented-generation-klesel-wittmann-2025]]*

---

<p class="kicker">§ 10 · Takeaway</p>

## The One Thing to Remember

**RAG's retrieval layer is both its greatest asset and its most exploitable surface.**

Context filtering and hybrid retrieval are the highest-ROI improvements available today. GraphRAG and RAPTOR are the architectural bets worth watching for complex, relational corpora. Security and data governance are where the field has the most ground to cover.

---

*Reference: [[project-overview]] — full synthesis of all three surveys*

*Sources: [[rag-comprehensive-survey-2506-00054]] · [[rag-comprehensive-survey-2410-12837]] · [[retrieval-augmented-generation-klesel-wittmann-2025]]*
