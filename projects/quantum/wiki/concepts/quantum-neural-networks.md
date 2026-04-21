---
type: concept
tags: [quantum machine learning, neural networks, variational circuits, deep learning]
---

# Quantum Neural Networks (QNN)

**Quantum Neural Networks** use parameterized quantum circuits (PQCs) as the computational substrate for learning. Tunable gate parameters θ are optimized via gradient descent (or gradient-free methods) to minimize a loss function.

## Forward Pass

```
|ψout⟩ = U(θ)|ψin⟩
```

Where U(θ) is a unitary transformation composed of parameterized gates, and |ψin⟩ is the encoded input state.

## Notable Results

| Task | Accuracy |
|------|---------|
| MNIST digit classification | 99.21% |
| Drug discovery | — |
| Medical image analysis | — |
| Satellite system optimization | — |

## Key Challenges

- **Barren plateaus** — gradients vanish exponentially with circuit width, making training of deep QNNs extremely difficult. Training complexity currently *exceeds* classical neural networks.
- **Noise sensitivity** — parameterized gates are disrupted by [[nisq-era]] hardware noise, causing degraded output fidelity.
- **State preparation bottleneck** — loading classical data into quantum states is costly and often dominates total circuit time.
- **Measurement collapse** — inference requires many circuit shots to estimate expectation values reliably.

## Hybrid Approaches

Most practical QNN deployments are **[[hybrid-classical-quantum-computing]]**: the quantum circuit handles a small, high-complexity subcomputation while classical hardware manages data preprocessing, loss computation, and parameter updates. This is the dominant paradigm on current [[nisq-era]] hardware.

## Classical Neural Networks for Quantum Hardware

Note: [[ai-for-quantum-computing]] (Nature Communications, 2025) documents the complementary direction — classical neural networks (CNNs, transformers, GNNs) applied *to* quantum hardware problems like [[quantum-error-correction]] and device calibration. Neural network decoders for [[surface-codes]] achieve ~7.1% error thresholds with CNNs and outperform classical MWPM with transformers.

## Sources

- [[quantum-ml-comprehensive-review-2025]]
- [[ai-for-quantum-computing]]

## Related Concepts

- [[quantum-machine-learning]]
- [[quantum-support-vector-machine]]
- [[quantum-k-nearest-neighbors]]
- [[nisq-era]]
- [[superposition]]
- [[quantum-entanglement]]
