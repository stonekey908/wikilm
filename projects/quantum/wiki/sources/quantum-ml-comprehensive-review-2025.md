---
type: source
title: "Quantum machine learning: A comprehensive review of integrating AI with quantum computing"
author: "PMC / National Library of Medicine"
date: "2025-01-01"
source_file: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12053761/"
tags: [quantum machine learning, survey, neural networks, applications, review]
---

# Quantum Machine Learning: A Comprehensive Review (2025)

Published in *MethodsX* (2025), this survey examines the integration of quantum computing with classical machine learning, covering three algorithm families (QSVM, QKNN, QNN) and their real-world applications in healthcare, finance, and image classification.

## Key Takeaways

- [[quantum-machine-learning]] derives its advantage from three quantum principles: [[superposition]], [[quantum-entanglement]], and [[quantum-interference]].
- [[quantum-support-vector-machine]] achieves 95% accuracy on breast cancer diagnosis tasks; kernel function expressed as K(xi,xj)=|⟨ϕ(xi)|ϕ(xj)⟩|².
- [[quantum-k-nearest-neighbors]] handles high-dimensional data using quantum distance metrics (Euclidean, Hamming, Mahalanobis).
- [[quantum-neural-networks]] reach 99.21% accuracy on MNIST image classification; forward pass defined as |ψout⟩=U(θ)|ψin⟩.
- All three algorithm families are constrained by [[nisq-era]] hardware limits: noise, decoherence, and scalability.
- Global quantum computing investment peaked at >$1.6 billion in 2023; QCaaS market projected to grow from $2.3B (2023) to $48.3B (2033).

## Notable Claims

- QSVMs encode data into quantum states rather than classical feature spaces, enabling exponential speedups on certain kernel evaluations.
- QNNs apply parameterized quantum gates (tunable θ) — training complexity currently *exceeds* classical counterparts due to barren plateaus and noise sensitivity.
- QKNN faces measurement sensitivity challenges: reading quantum state disturbs it, complicating repeated distance calculations.
- Publication volume in IEEE Xplore and Springer shows a "steady increase" especially in 2023–2024, signaling accelerating research momentum.

## Applications Highlighted

| Algorithm | Domain | Notable Result |
|-----------|--------|---------------|
| QSVM | Breast cancer diagnosis | 95% accuracy |
| QSVM | Air quality prediction | — |
| QKNN | Handwritten digit recognition | — |
| QKNN | Text and image classification | — |
| QNN | MNIST image classification | 99.21% accuracy |
| QNN | Drug discovery | — |
| QNN | Medical imaging | — |

## Persistent Obstacles

1. **Noise and error correction** — environmental disturbances cause qubit errors
2. **Limited coherence times** — qubits lose quantum properties before computation finishes
3. **Data encoding** — interfacing classical data with quantum registers remains costly
4. **Hardware scalability** — [[nisq-era]] devices too small for most real-world problem sizes

## Future Directions

- Noise-resistant quantum hardware beyond NISQ
- Hybrid quantum-classical training algorithms
- Applications beyond benchmark datasets
- Robust noise-mitigation strategies
- Optimized quantum circuit design

## Connections to Other Pages

- [[quantum-machine-learning]] — the overarching field this review surveys
- [[quantum-support-vector-machine]] — dedicated algorithm page
- [[quantum-k-nearest-neighbors]] — dedicated algorithm page
- [[quantum-neural-networks]] — dedicated algorithm page
- [[nisq-era]] — the hardware constraint framing nearly every limitation
