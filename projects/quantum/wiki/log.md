# Wiki Log

## [2026-04-21] ingest | Quantum Computing & AI: How They Work Together (2026 Guide) — BQP

Ingested BQP (BosonQ Psi) industry guide: "Quantum Computing & AI: How They Work Together (2026 Guide)". URL: https://www.bqpsim.com/blogs/quantum-computing-artificial-intelligence

**Pages created (7 new):**

- `wiki/sources/quantum-computing-ai-2026-guide-bqpsim.md` — source summary
- `wiki/entities/bqp-bosonq-psi.md` — BosonQ Psi; BQPhy® suite, QIO, QA-PINNs; 25× CFD speedup
- `wiki/entities/classiq.md` — quantum circuit synthesis platform; 100× compression in QCFD collaboration
- `wiki/concepts/quantum-approximate-optimization-algorithm.md` — QAOA: parameterized gate optimization for combinatorial problems
- `wiki/concepts/quantum-annealing.md` — adiabatic optimization via quantum tunneling; D-Wave hardware
- `wiki/concepts/physics-informed-neural-networks.md` — PINNs and QA-PINNs; quantum-assisted CFD training

**Pages enriched (6):**

- `wiki/concepts/hybrid-classical-quantum-computing.md` — added BQP three-layer model, six-step pipeline, production QCFD example
- `wiki/concepts/quantum-machine-learning.md` — added hybrid computing section + cross-reference to BQP guide
- `wiki/concepts/nisq-era.md` — added market timeline section (2026–2030 + 2030s+), McKinsey reference
- `wiki/entities/google-quantum-ai.md` — added 13,000× speedup vs Frontier supercomputer (Oct 2025)
- `wiki/entities/nvidia.md` — added BQP × Classiq × NVIDIA QCFD collaboration
- `wiki/concepts/post-quantum-cryptography.md` — added cross-reference for cybersecurity use cases

**Key findings:**
- Dominant near-term quantum-AI architecture is hybrid: three layers (quantum-assisted classical AI → QML → fully quantum AI); six-step pipeline.
- Google 13,000× speedup over Frontier using 65 qubits for physics simulation (Oct 2025).
- BQP × Classiq × NVIDIA QCFD: 100× circuit compression in production.
- Market timeline: mainstream adoption 2026–2030; quantum co-processors alongside GPUs/TPUs by 2030s.

**Wikilink audit:** all `[[wikilinks]]` resolve to existing pages. Redirect stub at `hybrid-quantum-classical-computing.md` points to canonical `hybrid-classical-quantum-computing.md`.

---

## [2026-04-21] synthesis | Project Overview

Created `wiki/synthesis/project-overview.md` synthesizing the intersection of quantum computing and AI, highlighting QML, hardware optimization, and the NISQ bottleneck.

---

## [2026-04-21] ingest | From Qubits to Insights: The Rise of Quantum AI in 2026

Ingested USDSI industry article (USDSI Editorial, published 2025-10-04). URL: https://www.usdsi.org/data-science-insights/from-qubits-to-insights-the-rise-of-quantum-ai-in-2026

**Pages created (6):**

- `wiki/sources/qubits-to-insights-quantum-ai-2026.md` — source summary
- `wiki/entities/ibm.md` — IBM quantum hardware (superconducting qubits, IBM Quantum cloud)
- `wiki/entities/microsoft.md` — Microsoft quantum hardware (topological qubits, Azure Quantum)
- `wiki/concepts/hybrid-classical-quantum-computing.md` — dominant practical deployment paradigm for NISQ-era QML
- `wiki/concepts/quantum-reinforcement-learning.md` — emerging QML direction for sequential decision-making

**Key findings captured:**
- Quantum AI market: USD 473.54M (2025) → USD 638.33M projected (2026), per Precedence Research
- All 2026 enterprise quantum AI deployments are hybrid classical-quantum; pure quantum is not feasible on NISQ hardware
- Active industry pilots: Biogen (drug discovery), JPMorgan Chase (risk modeling), DHL (route optimization)
- Main barriers: hardware decoherence, algorithm redesign complexity, shortage of quantum-literate practitioners

**Cross-references updated:**
- `quantum-machine-learning.md` — added market figure, industry applications section, new source reference
- `quantum-neural-networks.md` — linked hybrid approach to new `hybrid-classical-quantum-computing` page

**Wikilink audit:** all `[[wikilinks]]` in all 6 new pages resolve to pages created in this or prior ingests. No dangling links.

---

## [2026-04-21] ingest | Integrating AI and Quantum Computing: SLR (García-Pineda et al., 2025)

Ingested PRISMA 2020 systematic literature review by Vanessa García-Pineda, Alejandro Valencia-Arias, Francisco Eugenio López Giraldo, and Edison Andrés Zapata Ochoa. Published in *International Journal of Cognitive Computing in Engineering*. URL: https://www.sciencedirect.com/science/article/pii/S266630742500035X (full text fetched via web search due to 403 paywall; core content confirmed via Semantic Scholar and search result abstracts).

**Pages created (4):**

- `wiki/sources/ai-quantum-computing-slr-garcia-pineda.md` — source summary
- `wiki/concepts/quantum-optimization.md` — QAOA and VQE: hybrid quantum-classical optimization; NISQ-compatible variational algorithms for combinatorial problems
- `wiki/concepts/post-quantum-cryptography.md` — PQC algorithms resistant to quantum attacks; NIST 2024 standards (CRYSTALS-Kyber, Dilithium, SPHINCS+); Shor's algorithm threat model
- `wiki/concepts/quantum-simulation.md` — VQE-based molecular and materials simulation; drug discovery, energy, materials science applications

**Existing pages updated (2):**

- `wiki/concepts/quantum-machine-learning.md` — added "Broader QC–AI Landscape" section linking QML to quantum-optimization, post-quantum-cryptography, and quantum-simulation as peer advance areas
- `wiki/concepts/nisq-era.md` — added cross-domain constraint section noting NISQ is the binding factor for optimization, simulation, and QML; linked new concept pages

**Key findings captured:**
- Three headline QC–AI advance areas: quantum optimization (QAOA/VQE), QML, and post-quantum cryptography
- NISQ architectures + noise resilience shape all near-term AI deployments; hybrid variational approaches are the practical response
- Integration requirements: data encoding strategy, neural network hybridization, error mitigation
- Sectors with most adoption momentum: energy, healthcare, finance
- SLR reveals research gaps motivating targeted hybrid systems over waiting for fault-tolerant hardware

**Wikilink audit:** all `[[wikilinks]]` in all 4 new pages resolve to pages created in this or prior ingests. No dangling links.

---

## [2026-04-21] ingest | Artificial Intelligence for Quantum Computing (Nature Communications)

Ingested Nature Communications review paper: "Artificial Intelligence for Quantum Computing" (published 2025-12-02, NVIDIA + universities + quantum companies). URL: https://www.nature.com/articles/s41467-025-65836-3

**Pages created (9):**

- `wiki/sources/ai-for-quantum-computing.md` — source summary
- `wiki/concepts/quantum-error-correction.md` — AI decoders for QEC; CNN thresholds, transformer vs MWPM, GNN linear scaling
- `wiki/concepts/quantum-circuit-compilation.md` — RL, deep learning, AlphaTensor-Quantum, GPT-QE for unitary synthesis
- `wiki/concepts/surface-codes.md` — dominant topological code family; 2D lattice, ~1% threshold
- `wiki/concepts/superconducting-qubits.md` — primary QC hardware platform; ML-accelerated design and calibration
- `wiki/concepts/bayesian-optimization.md` — sample-efficient qubit calibration technique
- `wiki/entities/nvidia.md` — collaborating organization; GPU/AI infrastructure for quantum workloads
- `wiki/entities/alphaqubit.md` — Google DeepMind transformer decoder for distance-9 surface codes; 2B training examples
- `wiki/entities/alphatensor-quantum.md` — Google DeepMind T-gate minimization system

**Key findings captured:**
- Neural network decoders (CNN ~7.1% threshold, transformer > MWPM, GNN linear scaling) are the dominant AI-for-QEC direction
- AlphaQubit requires 2 billion training examples for distance-9 — training data bottleneck is a critical unsolved problem
- AlphaTensor-Quantum minimizes T-gates; GPT-QE applies language model generation to gate sequences
- Bayesian optimization + LLM agents match human scientist performance for device calibration
- Classical AI cannot simulate quantum systems in general (exponential scaling constraint remains fundamental)

**Cross-references:** `nisq-era.md` and `quantum-neural-networks.md` updated to link to new pages.

**Wikilink audit:** all `[[wikilinks]]` in all 9 new pages resolve to pages created in this or prior ingests. No dangling links.

---

## [2026-04-21] ingest | Exponential Quantum Advantage in ML Tasks

Ingested article from The Quantum Insider (Matt Swayne, 2026-04-10) covering arXiv:2604.07639 — a Caltech/Google Quantum AI/MIT/Oratomic pre-print claiming exponential quantum memory advantage for ML tasks.

**Pages created (8):**

- `wiki/sources/exponential-quantum-advantage-ml-tasks.md` — source summary
- `wiki/concepts/quantum-advantage.md` — umbrella concept covering time, memory, and sample-complexity advantages
- `wiki/concepts/quantum-oracle-sketching.md` — streaming data technique; primary algorithm in the paper
- `wiki/concepts/classical-shadow-tomography.md` — measurement strategy; developed by Huang and Preskill; applied as output layer
- `wiki/entities/john-preskill.md` — Caltech theorist, Oratomic co-founder, coined "quantum supremacy"
- `wiki/entities/hsin-yuan-huang.md` — Caltech/Oratomic; developed classical shadow tomography
- `wiki/entities/google-quantum-ai.md` — major institutional contributor; Neven, Babbush, McClean, Zhao
- `wiki/entities/oratomic.md` — quantum startup co-founded by Preskill and Huang

**Key finding:** the claimed advantage is memory-based (4–6 orders of magnitude reduction using <60 logical qubits), not runtime-based. Data loading still dominates end-to-end latency. Simulation-only — not validated on physical hardware.

**Cross-references added:** updated `quantum-machine-learning.md` and `nisq-era.md` to link to the new pages.

**Wikilink audit:** all `[[wikilinks]]` in all 8 pages resolve to pages created in this ingest or the prior ingest. No dangling links.

---

## [2026-04-21] ingest | Quantum ML Comprehensive Review 2025

Ingested PMC survey: "Quantum machine learning: A comprehensive review of integrating AI with quantum computing" (MethodsX, 2025). URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC12053761/

**Pages created (10 total):**

Sources:
- `wiki/sources/quantum-ml-comprehensive-review-2025.md`

Concepts:
- `wiki/concepts/quantum-machine-learning.md`
- `wiki/concepts/quantum-support-vector-machine.md`
- `wiki/concepts/quantum-k-nearest-neighbors.md`
- `wiki/concepts/quantum-neural-networks.md`
- `wiki/concepts/quantum-kernel-methods.md`
- `wiki/concepts/superposition.md`
- `wiki/concepts/quantum-entanglement.md`
- `wiki/concepts/quantum-interference.md`
- `wiki/concepts/nisq-era.md`

**Key findings captured:**
- QSVM: quantum kernel K(xi,xj)=|⟨ϕ(xi)|ϕ(xj)⟩|², 95% accuracy on breast cancer diagnosis
- QKNN: quantum distance metrics (Euclidean, Hamming, Mahalanobis), challenged by measurement sensitivity
- QNN: forward pass |ψout⟩=U(θ)|ψin⟩, 99.21% MNIST accuracy, barren plateau problem documented
- NISQ-era hardware is the binding constraint across all three algorithm families
- QCaaS market: $2.3B (2023) → $48.3B projected (2033)

**Wikilink graph:** All 10 pages fully interlinked; no dangling wikilinks.

---

## [2026-04-21] synthesis | Project Overview Update

Updated `wiki/synthesis/project-overview.md` to reflect new entities and concepts (BQP, Classiq, QAOA, PINNs) and the broader QC-AI landscape based on recent ingests.

---

## [2026-04-21] synthesis | Project Overview Refinement

Refined `wiki/synthesis/project-overview.md` to explicitly highlight contradictions between theoretical and industry sources, ensure comprehensive coverage of all new concepts and entities, and maintain tight length constraints.