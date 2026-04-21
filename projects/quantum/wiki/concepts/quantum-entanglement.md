---
type: concept
tags: [quantum computing, quantum mechanics, qubits, foundations]
---

# Quantum Entanglement

**Quantum entanglement** is a correlation between qubits such that the quantum state of one cannot be described independently of the others, regardless of the physical distance between them. Measuring one entangled qubit instantaneously determines the correlated state of its partner(s).

## Relevance to QML

In [[quantum-machine-learning]], entanglement enables compact representations of high-dimensional correlations. A classically exponential-size joint probability distribution over n variables can be represented by n entangled qubits. This is why quantum feature maps (used in [[quantum-support-vector-machine]]) and parameterized circuits (used in [[quantum-neural-networks]]) can access feature spaces that are classically intractable to compute.

Entanglement is created in quantum circuits via two-qubit gates (e.g., CNOT). On [[nisq-era]] hardware, entangling gates are more error-prone than single-qubit gates, making deep entangled circuits especially vulnerable to noise.

## Related Concepts

- [[superposition]]
- [[quantum-interference]]
- [[quantum-machine-learning]]
- [[nisq-era]]
