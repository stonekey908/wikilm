---
type: concept
tags: [quantum error correction, topological codes, fault tolerance, qubits]
---

# Surface Codes

A family of topological quantum error-correcting codes that arrange physical qubits on a 2D lattice. Currently the leading candidate for fault-tolerant quantum computing due to high error thresholds (~1%) and local stabilizer measurements.

## Structure

- Physical qubits sit on vertices and edges of a 2D grid
- **Stabilizer measurements** detect errors without measuring the logical state
- **Code distance** d: the minimum number of physical errors needed to cause a logical error; requires ~d² physical qubits per logical qubit
- **Distance-9 surface code**: roughly 81 physical qubits per logical qubit

## Why They Dominate

- Only require nearest-neighbor interactions — achievable with current superconducting qubit layouts
- High threshold (~1% physical error rate) compared to other code families
- Well-studied syndrome structure makes classical decoding tractable

## AI and Surface Codes

[[ai-for-quantum-computing]] reports CNNs achieving ~7.1% error thresholds on surface codes, and transformer models (notably [[alphaqubit]]) outperforming classical minimum-weight perfect matching (MWPM). [[alphaqubit]] decoded distance-9 surface codes but required 2 billion training examples.

Graph neural networks are promising because their message-passing structure mirrors the local structure of surface code syndromes, enabling linear scaling with code size.

## Connections

- [[quantum-error-correction]] — surface codes are the primary experimental platform
- [[alphaqubit]] — leading AI decoder for surface codes
- [[alphatensor-quantum]] — T-gate optimization for circuits compiled to run on surface-code processors
- [[superconducting-qubits]] — the hardware platform where surface codes are being implemented
- [[ai-for-quantum-computing]] — source paper
