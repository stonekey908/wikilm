---
type: synthesis
updated: "2026-04-17"
tags: [knowledge-management, digital-twin, agentic-ai, world-models, physical-ai, llm-wiki-pattern]
sources:
  - karpathy-second-brain-medium-article
  - mckinsey-what-is-digital-twin-technology
  - deloitte-agentic-ai-banking
  - ai-in-digital-twins-systematic-review
  - ieee-ai-digital-twins
  - nngroup-digital-twins-generative-ai
  - personal-ai-digital-twins-article
  - nvidia-world-models
  - genie-3-world-models
---

# Wiki Overview: The Convergence of AI, Simulation, and Knowledge

This wiki spans four interlocking topic clusters. They are not independent — the connections between them are where the insight lives.

---

## Cluster 1: Personal Knowledge Management

[[andrej-karpathy]]'s [[llm-wiki-pattern]] treats an LLM as a librarian: raw sources go in, structured interlinked markdown comes out. The key insight — shared by [[niklas-luhmann]]'s [[zettelkasten]] and [[knowledge-compilation]] frameworks — is that value compounds only when knowledge is actively organized, not just stored. [[retrieval-augmented-generation]] (chunk-and-search) is the dominant industry alternative, but the wiki pattern argues for deeper curation over shallow lookup. [[personal-ai]] takes this further with [[personal-language-models]]: small models fine-tuned on individual data as a form of cognitive augmentation.

---

## Cluster 2: Digital Twins

A [[digital-twin]] is a live virtual replica of a physical asset. [[mckinsey]] documents the ROI case across manufacturing, infrastructure, and healthcare. [[nasa]] pioneered the concept; the enterprise stack now runs through vendors like [[nvidia]] and platforms like the [[enterprise-metaverse]]. Key use case: [[predictive-maintenance]]. Key tension: [[ai-in-digital-twins-systematic-review]] exposes a persistent gap in virtual-to-physical synchronization that [[ieee-ai-digital-twins]]'s optimistic survey largely glosses over — **this is the wiki's primary inter-source contradiction**.

At the personal scale, [[nielsen-norman-group]] explores [[synthetic-user-modeling]] for UX research: individual-level digital twins that simulate behavioral responses. [[personal-ai]] connects digital twins back to Cluster 1 — a personal wiki and a personal language model are both forms of cognitive digital twin.

---

## Cluster 3: Agentic AI

[[agentic-ai]] systems reason, plan, and act autonomously. [[deloitte]]'s banking survey shows early deployment: [[jpmorgan-chase]]'s LAW system, [[bny-mellon]]'s payment automation, [[mastercard]] and [[paypal]] exploring agentic commerce. Infrastructure runs through [[amazon-bedrock]] and [[salesforce-agentforce]]. The central tension is [[autonomous-decision-making]] vs. [[human-oversight]] — [[governance-frameworks]] and [[regulatory-compliance]] are the unsolved layer. No source fully resolves this; each stakes out a position on the autonomy spectrum.

---

## Cluster 4: World Models & Physical AI

[[world-models]] are neural networks that learn to simulate physical dynamics — the bridge between perception and prediction. [[nvidia-cosmos]] provides foundation models for industrial simulation. [[google-deepmind]]'s [[genie-3]] generates interactive environments at 24fps using [[real-time-generation]] and implicit [[environmental-consistency]], enabling [[sima-agents]] to train in procedurally generated worlds. [[tokenization]] converts high-dimensional video/sensor data into learnable representations. [[video-generation]] is the output modality; [[physical-ai]] is the convergence destination — embodied agents that perceive, reason, and act in the real world.

---

## Cross-Cluster Connections

- **World models → digital twins**: world models make digital twins *dynamic* rather than static snapshots. This is a key bridge between Clusters 2 and 4 that no single source explicitly synthesizes.
- **Agentic AI + world models**: Clusters 3 and 4 are converging — autonomous agents need world models to reason about physical environments before acting.
- **LLM wiki ≈ personal digital twin**: the wiki pattern (Cluster 1) is structurally isomorphic to a cognitive digital twin (Cluster 2) — both maintain a live, queryable replica of a changing body of knowledge.

## Knowledge Gaps

- No comparison page yet (e.g., RAG vs. wiki pattern; Cosmos vs. Genie 3; advisory vs. autonomous AI).
- The world-models ↔ digital-twins connection is noted across pages but never synthesized into a dedicated page.
- Agentic AI governance remains underexplored — sources raise the problem but none model a concrete solution.
