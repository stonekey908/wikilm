---
type: concept
tags: [quantum-advantage, quantum-computing, benchmarking, complexity-theory]
---

# Quantum Advantage

The ability of a quantum system to solve a problem faster, with less memory, or at lower cost than the best known classical algorithm. The term is intentionally broader than "quantum supremacy" — it does not require the task to be practically useful, nor does it require the quantum system to outperform all possible future classical approaches.

## Flavors of Advantage

| Type | What is measured | Examples |
|---|---|---|
| **Time / gate-count** | Runtime or circuit depth | Shor's algorithm (factoring), Grover search |
| **Memory / space** | Working memory required | [[quantum-oracle-sketching]] (this paper) |
| **Sample complexity** | Number of measurements needed | [[classical-shadow-tomography]] |
| **Communication** | Bits exchanged in distributed tasks | Quantum fingerprinting |

The 2026 Caltech/Google Quantum AI study ([[exponential-quantum-advantage-ml-tasks]]) demonstrates a **memory-based** exponential advantage for ML tasks including classification, dimensionality reduction, and linear equation solving — achieving reductions of four to six orders of magnitude in memory requirements using fewer than 60 logical qubits.

## Why Memory Advantages Matter

Runtime advantages require deep circuits with many coherent operations — hard for near-term hardware. Memory advantages may be achievable with shallower circuits because the key operation (processing one sample then discarding it) can be done in bounded depth. This makes memory-based quantum advantage more practically accessible.

## Caveats and Debates

- Simulation vs. hardware: many claimed advantages are proven theoretically or via simulation but not demonstrated on physical devices.
- Data loading overhead: even with memory advantage, loading classical data into quantum states ("quantum RAM") may dominate runtime and erase practical gains.
- The classical algorithm may improve: a quantum advantage over the *best-known* classical algorithm can be erased if someone finds a better classical approach.

## Connections

- [[quantum-oracle-sketching]] — technique enabling memory advantage for streaming ML tasks.
- [[classical-shadow-tomography]] — measurement strategy that reduces sample complexity.
- [[john-preskill]] — coined the term "quantum supremacy" (now largely replaced by "quantum advantage").
- [[google-quantum-ai]] — published the 2019 supremacy claim on random circuit sampling; contributing institution on the 2026 ML advantage paper.
