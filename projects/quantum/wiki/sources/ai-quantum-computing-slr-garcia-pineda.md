---
type: source
title: "Integrating artificial intelligence and quantum computing: A systematic literature review of features and applications"
author: "Vanessa García-Pineda, Alejandro Valencia-Arias, Francisco Eugenio López Giraldo, Edison Andrés Zapata Ochoa"
date: "2025"
source_file: "https://www.sciencedirect.com/science/article/pii/S266630742500035X"
tags: [quantum computing, artificial intelligence, systematic review, PRISMA, optimization, cryptography, simulation, quantum machine learning, NISQ]
---

# Integrating AI and Quantum Computing: SLR (García-Pineda et al., 2025)

A systematic literature review (SLR) conducted under the **PRISMA 2020** methodology, drawing on studies from Scopus and Web of Science. The paper synthesizes 30+ studies on the integration of quantum computing (QC) and artificial intelligence (AI), cataloguing key features, integration requirements, and sector-specific applications. Published in the *International Journal of Cognitive Computing in Engineering*.

## Motivation

QC and AI are described as twin pillars of Industry 6.0, together enabling advances in automation, data analytics, and process optimization. The authors argue that a lack of structured knowledge about specific QC methodologies and their applicability to AI problems has slowed adoption and development — the SLR is designed to close that gap.

## Methodology

- **Protocol:** PRISMA 2020
- **Databases:** Scopus, Web of Science
- **Corpus:** 30+ peer-reviewed studies
- **Scope:** Features, integration requirements, and applications at the QC–AI intersection

## Key Technology Areas Identified

### 1. Quantum Machine Learning
[[quantum-machine-learning]] is identified as a primary growth area. Integration requirements include: neural network hybridization (classical and parameterized quantum circuits), quantum data encoding strategies, and error mitigation for enhanced model reliability.

### 2. Quantum Optimization
[[quantum-optimization]] using hybrid quantum-classical algorithms — particularly QAOA and VQE — is one of the three headline advance areas. Both algorithms are positioned as NISQ-compatible approaches to combinatorial optimization and eigenvalue estimation respectively.

### 3. Post-Quantum Cryptography
[[post-quantum-cryptography]] is the third headline area. As quantum hardware approaches cryptographically relevant scale, securing existing systems against quantum attacks becomes urgent. The review maps out the intersection of QC advances and cryptographic security.

### 4. Quantum Simulation
[[quantum-simulation]] is covered as a key application domain: simulating quantum mechanical systems at a level beyond classical computers, with direct impact on materials science, drug discovery, and energy systems.

## Quantum Computing Characteristics for AI Deployment

The paper identifies QC features that are most consequential for AI:

- **[[superposition]]** — enables parallel evaluation central to QML and optimization speedups
- **[[quantum-entanglement]]** — compact high-dimensional representations; crucial for data encoding
- **NISQ architectures** — current hardware generation; shapes what algorithms are feasible today (see [[nisq-era]])
- **Noise resilience** — error mitigation (not full error correction) is the practical path for near-term AI applications
- **Quantum simulation** — native advantage for simulating physical systems; not achievable classically at scale

## Sector Applications

| Sector | Primary Application |
|--------|---------------------|
| Healthcare | Quantum-accelerated drug discovery, diagnostics (QML) |
| Finance | Portfolio optimization, risk modeling (quantum optimization) |
| Cybersecurity | Post-quantum cryptographic protocols |
| Energy | Materials simulation for battery and solar research |
| Materials Science | Molecular and condensed-matter simulation |

Energy, healthcare, and finance are singled out as showing the most significant progress in adoption.

## Key Takeaways

- The three main advance areas are **quantum optimization**, **[[quantum-machine-learning]]**, and **[[post-quantum-cryptography]]** — not general-purpose quantum speedup.
- NISQ constraints remain the binding limitation across all AI applications; hybrid quantum-classical approaches (especially QAOA and VQE) are the practical response.
- Integration requirements are non-trivial: data encoding strategy, error mitigation, and circuit depth management each need problem-specific treatment.
- The SLR reveals research gaps that motivate targeted hybrid systems rather than waiting for fault-tolerant hardware.

## Relevance to Existing Wiki

- Reinforces [[nisq-era]] as the foundational hardware constraint across optimization, ML, and cryptography applications.
- Extends [[quantum-machine-learning]] beyond the algorithm families (QSVM/QKNN/QNN) covered in prior sources to include optimization and simulation as peer application areas.
- Introduces [[quantum-optimization]] and [[post-quantum-cryptography]] as new first-class topic areas for this wiki.
- Aligns with [[ai-for-quantum-computing]] (Nature Comms) on the centrality of error mitigation and hybrid architectures during the NISQ era.
