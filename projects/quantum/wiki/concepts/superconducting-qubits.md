---
type: concept
tags: [quantum hardware, qubits, superconducting circuits, calibration]
---

# Superconducting Qubits

Quantum bits implemented using superconducting circuits (typically Josephson junctions) cooled to millikelvin temperatures. Currently the dominant platform for large-scale quantum computing experiments, used by Google, IBM, and others.

## Key Properties

- Operate near absolute zero (~10-20 mK) to suppress thermal noise
- Gate times on the order of nanoseconds — fast compared to ion traps
- Coherence times in the microseconds-to-milliseconds range — shorter than ion traps
- Fabricated using semiconductor-compatible processes — scalable in principle

## AI Applications (from [[ai-for-quantum-computing]])

- **Hardware design**: ML accelerates exploration of qubit geometries and circuit configurations, optimizing for coherence and gate fidelity
- **Device tuning**: [[bayesian-optimization]] minimizes the number of experiments needed to calibrate quantum dot parameters
- **Real-time control**: Neural networks enable adaptive feedback during qubit operations
- **Automated calibration**: LLM agents demonstrated "performance comparable to human scientists" for device characterization workflows

## Challenges

- Fabrication variability: each qubit differs slightly, requiring individual calibration
- Crosstalk between neighboring qubits
- Frequency crowding as qubit counts increase
- The need for frequent recalibration as parameters drift

## Connections

- [[ai-for-quantum-computing]] — source paper
- [[quantum-error-correction]] — surface code QEC is implemented on superconducting hardware
- [[surface-codes]] — the primary error correction substrate for this platform
- [[bayesian-optimization]] — calibration technique
