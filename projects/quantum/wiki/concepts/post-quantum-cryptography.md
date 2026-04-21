---
type: concept
tags: [cryptography, quantum computing, security, NIST, lattice cryptography, post-quantum, cybersecurity]
---

# Post-Quantum Cryptography

**Post-quantum cryptography (PQC)** refers to cryptographic algorithms designed to be secure against attacks by quantum computers. It is one of the three headline advance areas at the QC–AI intersection identified by [[ai-quantum-computing-slr-garcia-pineda]], alongside [[quantum-machine-learning]] and [[quantum-optimization]].

## The Quantum Threat to Classical Cryptography

Modern public-key cryptography (RSA, ECC, Diffie-Hellman) relies on the computational hardness of factoring large integers or solving the discrete logarithm problem. **Shor's algorithm** — a quantum algorithm — solves both in polynomial time on a sufficiently large fault-tolerant quantum computer, rendering these schemes cryptographically broken at quantum scale.

Current quantum hardware ([[nisq-era]]) cannot run Shor's algorithm on cryptographically relevant key sizes. However, the threat is forward-looking: adversaries can harvest encrypted data today and decrypt it when quantum computers mature ("harvest now, decrypt later").

## Post-Quantum Algorithm Families

NIST completed its PQC standardization process in 2024, selecting algorithms based on mathematical problems believed to be hard for quantum computers:

| Family | Hard Problem | Example Schemes |
|--------|--------------|-----------------|
| Lattice-based | Shortest vector / Learning with Errors (LWE) | CRYSTALS-Kyber (KEM), CRYSTALS-Dilithium (signatures) |
| Hash-based | Collision resistance of hash functions | SPHINCS+ |
| Code-based | Decoding random linear codes | Classic McEliece |
| Multivariate | Solving multivariate polynomial systems | FALCON (secondary lattice scheme) |

Lattice-based schemes dominate the NIST selections due to strong security proofs and reasonable performance.

## Quantum AI Intersection

The SLR [[ai-quantum-computing-slr-garcia-pineda]] situates PQC within the broader QC–AI convergence:

- **AI-assisted cryptanalysis:** Machine learning is used to probe cryptographic implementations for side-channel vulnerabilities and weakness patterns — a threat to even PQC schemes if implementations are imperfect.
- **Quantum simulation for crypto:** [[quantum-simulation]] of lattice problems could theoretically probe the hardness assumptions underlying PQC, motivating ongoing research into the quantum security of NIST selections.
- **Hybrid encryption:** Near-term deployments combine classical algorithms with PQC in hybrid schemes, providing defense-in-depth during the transition period.

## Timeline and Urgency

- **NIST standards published:** 2024 (FIPS 203, 204, 205)
- **Migration horizon:** Organizations are advised to begin migration now due to long system lifetimes and the "harvest now, decrypt later" threat model.
- **Cryptographically relevant quantum computers:** Estimated 10–20+ years away at current hardware trajectories, but uncertainty is high.

## Sector Relevance

The cybersecurity sector is the primary consumer, but PQC affects any system transmitting sensitive data:

- Financial infrastructure (banking, payments)
- Government and defense communications
- Healthcare records
- Critical infrastructure control systems

## Limitations and Open Problems

- Migration is operationally complex: cryptographic libraries, hardware security modules, protocols, and key management all require updates.
- Lattice-based assumptions have not faced decades of cryptanalytic scrutiny that RSA has — new weaknesses could emerge.
- PQC algorithms generally have larger key/signature sizes than RSA/ECC, impacting bandwidth and storage in constrained environments.

## Related Concepts

- [[nisq-era]] — defines the current quantum threat horizon; full Shor's algorithm requires fault-tolerant hardware beyond NISQ
- [[quantum-machine-learning]] — AI tools used in cryptanalysis and protocol design
- [[quantum-optimization]] — peer advance area in the QC–AI integration landscape
- [[quantum-simulation]] — could probe hardness of PQC mathematical foundations
- [[quantum-computing-ai-2026-guide-bqpsim]] — cites anomaly detection and quantum-resistant encryption design as key cybersecurity use cases in the quantum-AI stack
