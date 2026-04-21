---
type: concept
tags: [quantum-algorithms, quantum-tomography, machine-learning, measurement, sample-complexity]
---

# Classical Shadow Tomography

A quantum measurement strategy that extracts usable classical information from a quantum state using far fewer measurements than full state tomography requires. Developed by [[hsin-yuan-huang]] and collaborators (original paper 2020, with John Neven and [[john-preskill]]). Applied in the 2026 ML advantage study ([[exponential-quantum-advantage-ml-tasks]]) as the output layer of a quantum ML pipeline.

## Core Idea

Standard quantum state tomography — fully reconstructing a quantum state's density matrix — requires exponentially many measurements in the number of qubits. Classical shadow tomography avoids this:

1. Apply a random unitary to the quantum state.
2. Measure in the computational basis.
3. Record the classical outcome as a "shadow".
4. Repeat with different random unitaries.

The collection of shadows is a compressed classical representation of the state. From it, many properties (expectation values, overlaps, entanglement witnesses) can be estimated efficiently without ever reconstructing the full state.

## Why This Matters for ML

In the 2026 quantum ML pipeline, after [[quantum-oracle-sketching]] builds a compact quantum state over a dataset, classical shadow tomography is used to extract predictions (e.g., class labels) without blowing up memory by reconstructing the quantum state. This keeps the end-to-end memory footprint small while producing classical outputs that downstream systems can use.

## Sample Complexity Advantage

Classical shadow tomography can estimate *M* different properties of a quantum state using only O(log M) measurements — a dramatic improvement over the O(M) measurements naive approaches need. This is the sample-complexity analog of the memory advantage claimed for [[quantum-oracle-sketching]].

## Limitations

- Works well for low-weight observables (local properties); estimating global properties is harder.
- Choice of random unitary ensemble affects which properties can be estimated efficiently.
- Assumes ideal, noiseless measurements; noise degrades shadow quality.

## Connections

- [[hsin-yuan-huang]] — primary developer; classical shadows are closely associated with his research program.
- [[john-preskill]] — collaborator on foundational work; co-founder of [[oratomic]] with Huang.
- [[quantum-oracle-sketching]] — paired technique in the 2026 ML pipeline.
- [[quantum-advantage]] — classical shadow tomography contributes a sample-complexity advantage on top of the memory advantage.
