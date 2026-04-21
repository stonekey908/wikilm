---
type: entity
entity_type: organization
tags: [quantum computing, software, circuit compression, industry]
---

# Classiq

Classiq is a quantum software company specializing in quantum circuit synthesis and optimization. Their platform allows engineers to describe quantum algorithms at a high level and automatically compiles them into optimized gate-level circuits, targeting specific quantum hardware backends.

## Role in Quantum AI Ecosystem

Classiq sits at the [[quantum-circuit-compilation]] layer of the quantum computing stack — translating high-level algorithmic intent into hardware-executable gate sequences. This is distinct from hardware providers (IBM, Google) and from application-layer companies like [[bqp-bosonq-psi]].

## Known Collaboration

In a joint project with [[bqp-bosonq-psi]] and [[nvidia]], Classiq contributed circuit optimization to achieve **100× circuit compression** for quantum computational fluid dynamics (QCFD). This collaboration is cited in [[quantum-computing-ai-2026-guide-bqpsim]] as a concrete example of the industry's [[hybrid-classical-quantum-computing]] stack operating end-to-end.

## Connections

- [[quantum-circuit-compilation]] — core capability
- [[hybrid-classical-quantum-computing]] — the architectural context their tools enable
- [[bqp-bosonq-psi]] — application-layer partner
- [[nvidia]] — hardware/infrastructure partner
