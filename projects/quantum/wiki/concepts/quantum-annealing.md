---
type: concept
tags: [quantum computing, optimization, annealing, combinatorial, hardware]
---

# Quantum Annealing

**Quantum annealing** is a metaheuristic optimization technique that uses quantum mechanical tunneling to find the global minimum of an objective function, particularly for combinatorial optimization problems. It is analogous to classical simulated annealing but replaces thermal fluctuations with quantum fluctuations — allowing the system to tunnel through energy barriers rather than climb over them.

## Mechanism

The system starts in a superposition of all possible solutions (high quantum fluctuation / "high tunneling field"). The tunneling field is slowly reduced, analogous to cooling in simulated annealing. The system ideally settles into the global energy minimum, which corresponds to the optimal solution.

The key quantum resource is **[[superposition]]**: the annealer evaluates many candidate solutions simultaneously before collapsing to the optimum.

## Hardware

Quantum annealing runs on purpose-built **adiabatic quantum computers** — most notably D-Wave Systems, which has deployed machines with thousands of qubits. This contrasts with gate-model quantum computers (IBM, Google) on which [[quantum-approximate-optimization-algorithm]] runs.

Annealing hardware does not require universal quantum gates or deep circuits, making it less susceptible to some [[nisq-era]] noise problems but also less flexible — it is designed exclusively for optimization problems in the Ising/QUBO formulation.

## Use Cases

Quantum annealing appears in [[quantum-computing-ai-2026-guide-bqpsim]] alongside QAOA as the two dominant near-term optimization approaches for:

- **Logistics** — vehicle routing, fleet optimization
- **Finance** — portfolio optimization, arbitrage detection
- **Manufacturing** — job-shop scheduling, supply chain
- **Drug discovery** — molecular conformation optimization

## Quantum Annealing vs. QAOA

| Dimension | Quantum Annealing | QAOA |
|-----------|------------------|------|
| Hardware | Dedicated annealers (D-Wave) | Gate-model QC (IBM, Google) |
| Circuit model | Adiabatic (continuous evolution) | Discrete parameterized gates |
| Noise sensitivity | Different profile — no gate errors, but connectivity limits | NISQ gate noise accumulates with depth |
| Flexibility | QUBO/Ising problems only | General combinatorial optimization |
| Optimality | Approximate (may not find global optimum) | Approximate |

## Relationship to Hybrid Computing

In [[hybrid-classical-quantum-computing]] stacks, quantum annealing is used as a quantum subroutine within larger classical workflows — similar to QAOA. [[bqp-bosonq-psi]]'s Quantum-Inspired Optimization (QIO) algorithms draw on annealing-inspired methods, achieveing up to 20× speedup over classical optimization without requiring physical annealing hardware.

## Related Concepts

- [[quantum-approximate-optimization-algorithm]] — gate-model alternative for combinatorial optimization
- [[hybrid-classical-quantum-computing]] — the architectural context annealing operates in
- [[superposition]] — the quantum resource exploited by annealing
- [[nisq-era]] — annealing hardware has a different noise profile than gate-model NISQ but faces its own scalability limits
- [[quantum-advantage]] — contested question of whether annealing provides practical advantage over best classical heuristics
