---
type: concept
tags: [quantum computing, optimization, QAOA, VQE, hybrid quantum-classical, NISQ, combinatorial optimization]
---

# Quantum Optimization

**Quantum optimization** applies quantum computational principles to solve optimization problems — finding the minimum (or maximum) of an objective function over a large search space. It is one of the most practically promising near-term application areas for quantum computing, identified alongside [[quantum-machine-learning]] and [[post-quantum-cryptography]] as a headline advance area in the QC–AI intersection by [[ai-quantum-computing-slr-garcia-pineda]].

## Why Quantum for Optimization?

Classical combinatorial optimization (e.g., scheduling, portfolio optimization, logistics) faces exponential worst-case scaling. Quantum approaches exploit [[superposition]] to evaluate multiple candidate solutions simultaneously and [[quantum-entanglement]] to encode correlations between variables — potentially navigating solution spaces more efficiently than classical heuristics.

## Key Algorithms

### QAOA — Quantum Approximate Optimization Algorithm

QAOA is a **hybrid quantum-classical** algorithm targeting combinatorial optimization problems (e.g., MaxCUT, traveling salesman, satisfiability). 

- **Structure:** Alternating layers of problem Hamiltonian and mixing Hamiltonian, parameterized by angles (γ, β). A classical optimizer tunes the angles; the quantum device evaluates candidate solutions.
- **NISQ compatibility:** Shallow circuits with tunable depth make QAOA viable on current noisy hardware (see [[nisq-era]]).
- **Limitation:** Approximation ratio improves with circuit depth, but deeper circuits accumulate noise. At low depth, QAOA may not outperform classical greedy heuristics.

### VQE — Variational Quantum Eigensolver

VQE finds the lowest eigenvalue of a Hamiltonian — most naturally applied to quantum chemistry and materials simulation, but also cast as an optimization problem.

- **Structure:** A parameterized ansatz circuit prepares a trial quantum state; a classical optimizer minimizes the expectation value of the Hamiltonian.
- **Applications:** Molecular ground-state energy calculations (drug discovery, materials), which feed into [[quantum-simulation]].
- **NISQ compatibility:** Designed explicitly for near-term hardware; circuit depth controlled by ansatz choice.

## Hybrid Quantum-Classical Pattern

Both QAOA and VQE follow the same **variational hybrid** pattern:

```
Quantum device: prepare state, evaluate objective
       ↕
Classical optimizer: update parameters (gradient descent, Nelder-Mead, SPSA, etc.)
```

This division exploits quantum devices for state-space exploration while offloading parameter optimization to classical hardware — a practical response to NISQ-era noise and limited qubit counts.

## Application Domains

Per the SLR [[ai-quantum-computing-slr-garcia-pineda]]:

- **Finance** — portfolio optimization, risk modeling, arbitrage detection
- **Energy** — power grid optimization, resource scheduling
- **Logistics** — vehicle routing, supply chain scheduling
- **Materials science** — molecule optimization as a complement to [[quantum-simulation]]

## Limitations and Open Problems

- QAOA approximation quality plateaus without deep circuits; noise erodes any advantage on current hardware.
- VQE ansatz design is problem-specific; generic ansätze (hardware-efficient) may miss the ground state.
- The **barren plateau problem** (see [[quantum-neural-networks]]) also affects variational optimization: gradients vanish exponentially as circuit width grows, making training difficult.
- Classical solvers (simulated annealing, evolutionary algorithms) remain competitive on many near-term benchmark problems.

## Related Concepts

- [[nisq-era]] — hardware context shaping all variational algorithms
- [[quantum-machine-learning]] — peer application area; shares the hybrid variational pattern
- [[quantum-simulation]] — VQE is the primary bridge between optimization and simulation
- [[quantum-circuit-compilation]] — circuit compilation quality directly affects QAOA/VQE performance
- [[quantum-error-correction]] — long-term path to deeper QAOA circuits without noise degradation
