---
type: concept
tags: [quantum computing, hardware, NISQ, noise, scalability]
---

# NISQ Era

**NISQ** (Noisy Intermediate-Scale Quantum) refers to the current generation of quantum hardware: devices with tens to a few hundred qubits that are too noisy and too small for full fault-tolerant quantum computation, but large enough to potentially demonstrate quantum advantage on specific tasks.

The term was coined by physicist [[john-preskill]] in 2018.

## Key Characteristics

- **Qubit count**: ~50–1000 physical qubits (as of 2024–2025), but effective logical qubit count far lower due to error rates.
- **No error correction**: NISQ devices lack the qubit overhead for quantum error correction (which requires ~1000 physical qubits per logical qubit).
- **Short coherence times**: Qubits decohere in microseconds to milliseconds — circuits must complete quickly.
- **Gate errors**: Two-qubit gate fidelities typically 99–99.9%; errors accumulate rapidly in deep circuits.

## Impact on QML

Nearly every limitation discussed in [[quantum-ml-comprehensive-review-2025]] traces back to NISQ constraints:

- [[quantum-neural-networks]] suffer noise-induced gradient degradation and require shallow circuits.
- [[quantum-support-vector-machine]] circuits must stay short, limiting kernel complexity.
- [[quantum-k-nearest-neighbors]] state preparation overhead dominates on small noisy devices.

## Path Forward

The research community targets two exits from the NISQ era:
1. **Fault-tolerant QC** — sufficient qubit counts + error correction for logical qubits (estimated 1M+ physical qubits for practical workloads). [[surface-codes]] are the leading code family; AI-driven [[quantum-error-correction]] decoders are a key enabler per [[ai-for-quantum-computing]].
2. **Better NISQ algorithms** — noise-aware [[quantum-circuit-compilation]], error mitigation (not correction), hybrid quantum-classical architectures.

## Memory Advantage vs. NISQ Constraints

The 2026 Caltech/[[google-quantum-ai]] study ([[exponential-quantum-advantage-ml-tasks]]) is notable in NISQ context: it claims advantage using fewer than 60 logical qubits and shallow streaming operations — a regime more accessible than deep fault-tolerant circuits. The advantage is in **memory**, not speed, which sidesteps some NISQ gate-depth limits. Still simulation-only.

## NISQ as Cross-Domain Constraint

The PRISMA SLR [[ai-quantum-computing-slr-garcia-pineda]] confirms that NISQ constraints are the binding factor not just for QML but across all three headline QC–AI advance areas: [[quantum-optimization]] (QAOA and VQE are explicitly designed for NISQ), [[quantum-machine-learning]], and [[quantum-simulation]] (VQE-based molecular simulation is the dominant NISQ simulation method). [[post-quantum-cryptography]] is distinct — it responds to the eventual *exit* from NISQ, not the constraints of the era itself.

## Market Timeline

The [[quantum-computing-ai-2026-guide-bqpsim]] guide summarizes industry consensus on the path beyond NISQ:

- **2026–2030:** Error-corrected scalable systems emerging; hybrid AI with quantum subroutines as modular components; enterprise pilots in finance, pharma, aerospace expanding.
- **2030s+:** Quantum co-processors alongside GPUs/TPUs in AI data centers. IBM targeting quantum advantage by 2026; McKinsey (2025) confirms quantum addresses AI's core constraints (algorithmic efficiency, memory walls, compute bottlenecks).

[[hybrid-quantum-classical-computing]] is the dominant bridge architecture for the NISQ window.

## Related Concepts

- [[quantum-machine-learning]]
- [[quantum-optimization]]
- [[quantum-simulation]]
- [[post-quantum-cryptography]]
- [[quantum-neural-networks]]
- [[quantum-support-vector-machine]]
- [[quantum-k-nearest-neighbors]]
- [[quantum-advantage]]
- [[superposition]]
- [[quantum-entanglement]]
- [[hybrid-quantum-classical-computing]] — the dominant architecture for the NISQ window
