---
type: concept
tags: [quantum computing, quantum mechanics, qubits, foundations]
---

# Superposition

**Superposition** is the quantum mechanical property allowing a qubit to exist in a combination of |0⟩ and |1⟩ states simultaneously, rather than a definite one or the other.

A qubit in superposition is written:

```
|ψ⟩ = α|0⟩ + β|1⟩
```

Where α and β are complex amplitudes satisfying |α|² + |β|² = 1. Upon measurement, the qubit collapses to |0⟩ with probability |α|² or |1⟩ with probability |β|².

## Relevance to QML

Superposition enables quantum computers to evaluate many possible states in parallel within a single circuit execution. In [[quantum-machine-learning]], this is the foundational mechanism behind potential exponential speedups — a quantum circuit on n qubits can represent 2ⁿ states simultaneously.

However, measurement collapses superposition; extracting information requires many repeated measurements (shots) or carefully designed circuits that amplify the desired output via [[quantum-interference]].

## Related Concepts

- [[quantum-entanglement]]
- [[quantum-interference]]
- [[quantum-machine-learning]]
- [[nisq-era]]
