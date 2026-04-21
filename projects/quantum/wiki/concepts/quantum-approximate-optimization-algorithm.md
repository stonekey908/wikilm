---
type: concept
tags: [quantum computing, optimization, algorithm, NISQ, combinatorial]
---

# Quantum Approximate Optimization Algorithm (QAOA)

**QAOA** (Quantum Approximate Optimization Algorithm) is a hybrid quantum-classical algorithm designed for combinatorial optimization problems — tasks where the goal is to find the best configuration among an exponentially large set of possibilities. It is one of the most actively studied [[nisq-era]] algorithms because its shallow circuit depth makes it more tractable on current noisy hardware than deeper fault-tolerant approaches.

## How It Works

QAOA encodes a combinatorial problem (e.g., graph partitioning, scheduling, portfolio allocation) into a quantum Hamiltonian. A parameterized quantum circuit alternates between two operations — the problem Hamiltonian and a mixing Hamiltonian — for a fixed number of layers *p*. A classical optimizer then tunes the circuit parameters to maximize the probability of measuring the optimal (or near-optimal) solution.

The result is approximate: QAOA is not guaranteed to find the globally optimal solution, but it can find high-quality solutions faster than brute-force classical search for certain problem structures.

## Role in Quantum AI

QAOA is used in the [[hybrid-classical-quantum-computing]] stack as a quantum subroutine for:

- **Finance** — portfolio optimization, risk model calibration
- **Logistics** — route planning for global fleets
- **Manufacturing** — supply chain optimization across thousands of variables
- **Machine learning** — hyperparameter tuning, neural architecture search

It appears alongside [[quantum-annealing]] as one of the two dominant near-term optimization approaches mentioned in [[quantum-computing-ai-2026-guide-bqpsim]].

## Relationship to Quantum Annealing

QAOA and [[quantum-annealing]] both attack combinatorial optimization, but differ architecturally:
- Quantum annealing uses continuous physical evolution (adiabatic); QAOA uses a discrete parameterized gate sequence.
- QAOA runs on gate-model quantum computers (IBM, Google); annealing requires dedicated annealers (e.g., D-Wave).
- QAOA is gate-depth sensitive and thus NISQ-constrained; at low *p* it degrades gracefully.

## Current Limitations

- Performance at low *p* (few layers) is modest; competitive advantage over classical solvers at practical *p* is unproven at scale.
- Requires classical parameter optimization in the outer loop — a classical bottleneck.
- Hardware noise on NISQ devices degrades QAOA circuit quality rapidly with increasing *p*.

## Related Concepts

- [[hybrid-classical-quantum-computing]] — the architectural context QAOA operates in
- [[quantum-annealing]] — alternative optimization paradigm
- [[quantum-machine-learning]] — broader field; QAOA as one of its subroutines
- [[nisq-era]] — the hardware context that shapes QAOA's practical regime
- [[superposition]] — QAOA exploits quantum superposition to evaluate many configurations simultaneously
