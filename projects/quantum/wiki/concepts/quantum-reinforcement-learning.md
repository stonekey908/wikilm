---
type: concept
tags: [quantum machine learning, reinforcement learning, optimization, quantum AI]
---

# Quantum Reinforcement Learning

**Quantum reinforcement learning (QRL)** applies quantum computing principles to reinforcement learning — the paradigm where an agent learns optimal behavior through trial-and-error interaction with an environment. Quantum circuits replace or augment the policy and value networks of classical RL.

## Core Idea

Classical RL faces exponential state-space challenges in complex environments. Quantum approaches aim to exploit [[superposition]] and [[quantum-entanglement]] to represent large policy spaces more compactly and to evaluate Q-values or policy gradients faster.

A QRL agent typically uses:
- A parameterized quantum circuit as the policy network
- Classical optimization (gradient descent or gradient-free methods) to update circuit parameters
- Standard RL reward signals and environment interaction

This makes QRL a [[hybrid-classical-quantum-computing]] paradigm: the policy evaluation is quantum, but environment simulation and optimization remain classical.

## Potential Advantages

- **State space compression** — quantum states can compactly encode exponentially large action-state distributions
- **Faster policy evaluation** — [[quantum-advantage]] in certain matrix operations could accelerate Q-function computation
- **Exploration** — superposition-based exploration strategies are theoretically richer than classical epsilon-greedy

## Current Status (2026)

QRL is the least mature of the three main [[quantum-machine-learning]] families (compared to [[quantum-support-vector-machine]] and [[quantum-neural-networks]]). Demonstrated results remain on small, toy environments. [[nisq-era]] hardware constraints (decoherence, limited qubits) severely limit circuit depth and thus the complexity of learnable policies.

[[qubits-to-insights-quantum-ai-2026]] lists quantum-enhanced RL as an active area of quantum AI development in 2026 enterprise contexts, alongside QSVMs and QNNs.

## Related Concepts

- [[quantum-machine-learning]] — overarching field
- [[quantum-neural-networks]] — closest structural analogue (parameterized quantum circuits)
- [[hybrid-classical-quantum-computing]] — the deployment paradigm
- [[quantum-advantage]] — what QRL is ultimately aiming for
- [[nisq-era]] — the hardware constraint limiting QRL today
- [[superposition]], [[quantum-entanglement]] — quantum properties enabling compact policy representation

## Sources

- [[qubits-to-insights-quantum-ai-2026]] — industry overview citing QRL as active quantum AI direction
