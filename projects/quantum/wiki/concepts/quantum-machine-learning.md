---
type: concept
tags: [quantum machine learning, quantum computing, machine learning, survey]
---

# Quantum Machine Learning

**Quantum machine learning (QML)** is the field that applies quantum computing principles to machine learning tasks, aiming for computational advantages over classical algorithms on certain problem classes.

## Core Quantum Principles

QML's theoretical advantage rests on three quantum mechanical properties:

- **[[superposition]]** — qubits exist in multiple states simultaneously, enabling parallel evaluation of many hypotheses at once.
- **[[quantum-entanglement]]** — qubits share interdependent states; measuring one instantly determines correlated qubits, enabling compact representations of high-dimensional correlations.
- **[[quantum-interference]]** — quantum states combine constructively or destructively, amplifying correct solutions and suppressing wrong ones.

## Algorithm Families

The three main QML algorithm families, as surveyed in [[quantum-ml-comprehensive-review-2025]]:

| Algorithm | Classical Analogue | Key Quantum Advantage |
|-----------|-------------------|----------------------|
| [[quantum-support-vector-machine]] | SVM | Quantum kernel evaluation |
| [[quantum-k-nearest-neighbors]] | k-NN | Quantum distance computation |
| [[quantum-neural-networks]] | Neural networks | Parameterized quantum circuits |

## Hardware Reality: The NISQ Constraint

Current QML runs on [[nisq-era]] (Noisy Intermediate-Scale Quantum) devices, which impose hard limits:
- Qubit counts too small for most practical workloads
- Environmental noise degrades computation
- Coherence times short relative to circuit depth needed

Most demonstrated QML results are on small or synthetic datasets; scaling to real-world size remains an open problem.

## Market Trajectory

- Global QC investment: >$1.6B in 2023
- Quantum computing-as-a-service (QCaaS): $2.3B (2023) → $48.3B projected (2033)
- **Quantum AI market**: USD 473.54M (2025) → USD 638.33M projected (2026) — [[qubits-to-insights-quantum-ai-2026]]

## Industry Applications (2026)

Enterprise quantum AI pilots are uniformly [[hybrid-classical-quantum-computing]] deployments, accessed via cloud platforms ([[ibm]], [[google-quantum-ai]], [[microsoft]]). Active sectors per [[qubits-to-insights-quantum-ai-2026]]:

- **Healthcare** — protein folding and molecular simulation
- **Finance** — risk modeling and fraud detection
- **Logistics** — route optimization
- **Materials science** — atomic/molecular modeling
- **Cybersecurity** — predictive threat modeling

## Memory-Based Quantum Advantage

A 2026 study ([[exponential-quantum-advantage-ml-tasks]]) adds a new dimension to QML: rather than claiming speed advantages, it demonstrates exponential **memory** advantages for classification, dimensionality reduction, and linear equation solving. Using [[quantum-oracle-sketching]] and [[classical-shadow-tomography]], quantum systems (< 60 logical qubits) required four to six orders of magnitude less memory than classical equivalents on real-world datasets. Validated only via simulation — not on physical hardware.

## Broader QC–AI Landscape

QML sits alongside [[quantum-optimization]] and [[post-quantum-cryptography]] as one of the three headline advance areas at the QC–AI intersection, per the systematic literature review [[ai-quantum-computing-slr-garcia-pineda]]. Sector applications highlighted: healthcare (diagnostics), finance (portfolio optimization), energy (materials simulation via [[quantum-simulation]]).

## Hybrid Quantum-Classical Context

In practice, pure QML circuits remain constrained by [[nisq-era]] hardware. The dominant near-term architecture is [[hybrid-quantum-classical-computing]]: quantum circuits handle optimization and feature extraction while classical networks do the bulk of training. [[bqp-bosonq-psi]]'s QA-PINN product and the BQP × [[classiq]] × [[nvidia]] QCFD collaboration are industry examples of this layer in production.

## Key Sources

- [[quantum-ml-comprehensive-review-2025]] — 2025 PMC survey covering QSVM, QKNN, and QNN in depth
- [[exponential-quantum-advantage-ml-tasks]] — 2026 study: memory-based exponential advantage for data-processing tasks
- [[ai-quantum-computing-slr-garcia-pineda]] — PRISMA 2020 SLR placing QML within the broader QC–AI integration landscape; highlights integration requirements (data encoding, error mitigation, neural network hybridization)
- [[qubits-to-insights-quantum-ai-2026]] — 2026 industry overview: market size, cross-sector adoption, hybrid integration strategies
- [[quantum-computing-ai-2026-guide-bqpsim]] — 2026 industry guide covering the hybrid quantum-AI stack, sector applications, and market timeline
