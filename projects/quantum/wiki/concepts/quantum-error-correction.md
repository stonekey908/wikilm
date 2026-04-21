---
type: concept
tags: [quantum computing, error correction, fault tolerance, machine learning, surface codes]
---

# Quantum Error Correction

The set of techniques that protect quantum information from decoherence and gate errors by encoding logical qubits redundantly across many physical qubits. Considered the critical bottleneck for scaling quantum computers to fault-tolerant operation.

## Why It's Hard

Quantum states cannot be copied (no-cloning theorem), so classical redundancy schemes don't apply directly. Instead, QEC codes spread logical information non-locally and use syndrome measurements to detect errors without collapsing the logical state.

The **decoder** — the classical algorithm that interprets syndrome measurements and determines which correction to apply — must run faster than errors accumulate. This real-time latency requirement makes decoder performance critical.

## AI Approaches

Per [[ai-for-quantum-computing]]:

| Approach | Result |
|---|---|
| CNNs | ~7.1% error threshold on topological codes |
| Transformer decoders | Outperform minimum-weight perfect matching (MWPM) |
| Graph neural networks | Linear inference scaling — key for real-time deployment |
| [[alphaqubit]] (transformer) | State-of-the-art on distance-9 [[surface-codes]], but needed 2B training examples |

Graph neural networks are particularly promising because their linear scaling with code distance makes them viable for real-time decoding at large scales.

## Key Threshold Concept

A code has a **threshold error rate**: if physical error rates are below this threshold, adding more qubits reduces the logical error rate. Above threshold, adding qubits makes things worse. AI decoders push this threshold higher (or achieve the theoretical threshold more reliably).

## Open Challenges

- **Training data bottleneck**: quantum hardware is expensive; generating billions of training examples requires either hardware time or high-fidelity simulation
- **Latency requirements**: decoders must operate faster than error rates allow — GPU inference speed becomes critical
- **Code distance scaling**: performance must hold as codes grow from distance-3 to distance-50+

## Connections

- [[surface-codes]] — primary code family used in AI QEC experiments
- [[alphaqubit]] — leading transformer-based decoder
- [[ai-for-quantum-computing]] — source paper covering AI approaches to QEC
- [[superconducting-qubits]] — primary hardware platform where QEC is being developed
