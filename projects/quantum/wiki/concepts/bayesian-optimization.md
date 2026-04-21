---
type: concept
tags: [optimization, machine learning, calibration, quantum computing]
---

# Bayesian Optimization

A sample-efficient black-box optimization method that builds a probabilistic surrogate model (typically a Gaussian process) of an expensive objective function, then uses an acquisition function to choose the next most informative evaluation point.

## Why It Matters for Quantum Computing

Quantum hardware calibration is expensive: each experiment takes time on cryogenic hardware, and the parameter space (qubit frequencies, pulse shapes, coupling strengths) is high-dimensional. Bayesian optimization minimizes the number of experiments needed to find optimal operating points.

Per [[ai-for-quantum-computing]], Bayesian optimization is specifically applied to:

- **Quantum dot tuning**: finding the voltage parameters that place a quantum dot in the correct charge state
- **Gate calibration**: optimizing pulse parameters for high-fidelity single- and two-qubit gates
- **General device characterization**: replacing manual "poke-and-observe" workflows with principled sequential design

## Mechanism

1. Start with a few random evaluations of the objective
2. Fit a Gaussian process to observed points
3. Use an acquisition function (e.g., expected improvement, upper confidence bound) to pick the next point that maximizes information gain
4. Repeat until convergence or budget exhaustion

This approach typically requires 10-100x fewer experiments than grid search for the same result quality.

## Connections

- [[ai-for-quantum-computing]] — source paper citing Bayesian optimization for qubit calibration
- [[superconducting-qubits]] — primary hardware context where this is applied
