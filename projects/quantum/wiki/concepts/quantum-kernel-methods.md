---
type: concept
tags: [quantum machine learning, kernel methods, support vector machines, feature maps]
---

# Quantum Kernel Methods

**Quantum kernel methods** replace the classical kernel function in algorithms like SVMs with a quantum circuit that computes an inner product in an exponentially large quantum feature space. The kernel value is estimated by measuring overlap between quantum states encoding the two inputs.

## Quantum Kernel Formula

```
K(xi, xj) = |⟨ϕ(xi)|ϕ(xj)⟩|²
```

Where |ϕ(x)⟩ is the quantum encoding (feature map) of input x, implemented as a unitary circuit U_ϕ(x)|0⟩.

## Why Quantum Feature Maps?

Classical kernels (RBF, polynomial) operate in feature spaces that can be computed efficiently classically. Quantum feature maps encode data into a 2ⁿ-dimensional Hilbert space — a feature space whose size is exponential in the number of qubits n. Computing the kernel classically would require exponential time; a quantum device estimates it in polynomial circuit depth.

The open question — **quantum kernel advantage** — is whether any real-world dataset has structure that benefits from this particular type of high-dimensional feature space.

## Relationship to QSVM

[[quantum-support-vector-machine]] is the primary application of quantum kernel methods. The SVM optimization itself remains classical; only the kernel evaluation is quantum.

## Limitations

- Kernel evaluation requires separate quantum circuit executions per training pair — O(n²) circuits for n training points.
- [[nisq-era]] noise corrupts kernel estimates, reducing effective kernel quality.
- No compelling real-world dataset yet found where quantum kernels outperform classical kernels on identical hardware-equivalent resources.

## Sources

- [[quantum-ml-comprehensive-review-2025]]

## Related Concepts

- [[quantum-support-vector-machine]]
- [[quantum-machine-learning]]
- [[nisq-era]]
- [[quantum-entanglement]]
