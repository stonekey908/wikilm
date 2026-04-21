---
type: concept
tags: [quantum computing, quantum mechanics, foundations]
---

# Quantum Interference

**Quantum interference** is the phenomenon where quantum probability amplitudes add together — constructively (amplifying probability) or destructively (suppressing probability). It is the mechanism by which quantum algorithms steer computation toward correct answers and away from wrong ones.

## How It Works

Unlike classical probabilities (which always add positively), quantum amplitudes are complex numbers. When two paths leading to the same computational outcome have amplitudes of opposite sign, they cancel. When they have the same sign, they reinforce.

Well-designed quantum algorithms (e.g., Grover's search, quantum phase estimation) carefully arrange interference so that the amplitude at the correct output is maximized at measurement time.

## Relevance to QML

In [[quantum-machine-learning]], interference is the mechanism that makes [[quantum-neural-networks]] and quantum kernel methods potentially more expressive than their classical analogues. The parameterized gates in [[quantum-neural-networks]] (U(θ)) control interference patterns to shape the output distribution during training.

On [[nisq-era]] hardware, noise disrupts the interference pattern, degrading the quality of the computation.

## Related Concepts

- [[superposition]]
- [[quantum-entanglement]]
- [[quantum-machine-learning]]
- [[quantum-neural-networks]]
- [[nisq-era]]
