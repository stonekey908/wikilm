---
type: concept
tags: [quantum machine learning, k-nearest neighbors, classification, distance metrics]
---

# Quantum K-Nearest Neighbors (QKNN)

**Quantum K-Nearest Neighbors** implements the classical k-NN algorithm using quantum circuits to compute distances between data points. Distance metrics supported include Euclidean, Hamming, and Mahalanobis, each implementable as quantum inner-product or swap-test circuits.

## How It Works

1. Encode query point and dataset points as quantum states.
2. Use quantum circuits (e.g., SWAP test) to estimate pairwise distances.
3. Identify k nearest neighbors by magnitude of overlap.
4. Return majority-vote label or average value.

The quantum speedup comes from computing distances in superposition — evaluating many candidate neighbors simultaneously rather than sequentially.

## Applications

- Image classification
- Text classification
- High-dimensional data analysis
- Handwritten digit recognition

## Challenges

- **Measurement sensitivity** — reading (measuring) a quantum state disturbs it; repeated distance queries require re-preparation of the quantum state each time.
- **Implementation complexity** — quantum circuit depth grows with dataset dimensionality.
- **Resource requirements** — state preparation overhead can dominate for small datasets, erasing any quantum advantage.

## Limitations vs. Classical k-NN

Classical k-NN is embarrassingly simple to implement and performs well on GPU hardware. QKNN's advantage is theoretical for very large, high-dimensional datasets on future fault-tolerant hardware — not yet demonstrated practically at scale on [[nisq-era]] devices.

## Sources

- [[quantum-ml-comprehensive-review-2025]]

## Related Concepts

- [[quantum-machine-learning]]
- [[quantum-support-vector-machine]]
- [[quantum-neural-networks]]
- [[nisq-era]]
