---
type: entity
entity_type: product
tags: [quantum circuit compilation, T-gates, Google DeepMind, fault tolerance]
---

# AlphaTensor-Quantum

Google DeepMind's AI system for minimizing T-gates in fault-tolerant quantum circuits. Cited in [[ai-for-quantum-computing]] as a leading example of AI-driven [[quantum-circuit-compilation]].

## Key Facts

- Extension of Google DeepMind's AlphaTensor (matrix multiplication discovery system) applied to quantum computing
- Targets T-gate minimization — T-gates are the most expensive operation in fault-tolerant quantum circuits because they require magic state distillation
- Reduces circuit cost without changing the logical operation performed

## Why T-Gates Matter

In fault-tolerant quantum computing (e.g., with [[surface-codes]]), Clifford gates are cheap to implement transversally, but non-Clifford gates like T require resource-intensive distillation protocols. Minimizing T-gate count directly reduces the overhead of running fault-tolerant algorithms.

## Connections

- [[ai-for-quantum-computing]] — source paper citing AlphaTensor-Quantum
- [[quantum-circuit-compilation]] — the broader problem it addresses
- [[surface-codes]] — fault-tolerant context in which T-gate cost is high
- [[alphaqubit]] — sibling Google DeepMind product for error correction
