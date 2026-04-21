---
type: concept
tags: [quantum machine learning, support vector machine, classification, kernel methods]
---

# Quantum Support Vector Machine (QSVM)

A **Quantum Support Vector Machine** encodes training data into quantum states and computes the kernel function using quantum circuits, rather than classical feature maps. This can yield exponential speedups for certain kernel evaluations.

## Quantum Kernel

The kernel function used in QSVMs:

```
K(xi, xj) = |⟨ϕ(xi)|ϕ(xj)⟩|²
```

Where |ϕ(x)⟩ is the quantum state encoding of input x. This inner product is measured on quantum hardware and feeds into a classical SVM optimizer.

## Applications

| Domain | Result |
|--------|--------|
| Breast cancer diagnosis | 95% accuracy |
| Air quality prediction | — |
| Mental health diagnosis | — |
| Weather modeling | — |

## Limitations

- **Hardware constraints** — quantum feature map circuits require more qubits than current [[nisq-era]] devices provide for non-trivial problems.
- **Scalability** — quadratic growth in training data remains a bottleneck; each kernel evaluation requires a separate quantum circuit execution.
- **Limited dataset size** — most demonstrated results use small, controlled datasets.

## Relationship to Classical SVMs

Classical SVMs find a maximum-margin hyperplane in a feature space defined by the kernel. QSVMs replace the classical kernel with a quantum one, potentially accessing feature spaces that are classically intractable to compute — the proposed source of quantum advantage.

## Sources

- [[quantum-ml-comprehensive-review-2025]]

## Related Concepts

- [[quantum-machine-learning]]
- [[quantum-k-nearest-neighbors]]
- [[quantum-neural-networks]]
- [[nisq-era]]
- [[quantum-kernel-methods]]
