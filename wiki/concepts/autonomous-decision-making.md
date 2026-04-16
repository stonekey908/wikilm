---
type: concept
tags: [agentic-ai, governance, risk-management, accountability, autonomous-systems]
---

# Autonomous Decision-Making

## Definition

Systems that can make binding decisions without human pre-approval, relying on learned patterns, real-time data, and programmed constraints. In [[agentic-ai]] contexts, this means agents selecting actions and trade-offs based on goals and environment state.

## Spectrum of Autonomy

| Level | Human Role | Risk | Example |
|-------|-----------|------|---------|
| No autonomy | Approves every decision | Very low | Manual loan underwriting |
| Advisory | Recommends; human decides | Low | Credit scoring system flagging risk |
| Delegated | Executes within guardrails; human monitors | Medium | Payment fraud detector blocking transactions |
| Autonomous | Acts independently; human reviews logs | High | Agent executing market trades |
| Full autonomy | No human oversight | Extreme | Unmonitored agent operating financial system |

## Banking Context ([[deloitte-agentic-ai-banking]])

JPMorgan Chase's LAW and similar systems operate in delegated → autonomous range, where agents:
- Analyze legal documents
- Extract relevant clauses
- Answer queries (92.9% accuracy)
- Flag exceptions for human review

Risk: If accuracy drops below threshold or agent misinterprets edge case, could produce legally incorrect guidance.

## Governance Requirements

**Human Oversight**: Keep humans at key decision points to ensure accountability and organizational resilience.

**Constraint Definition**: Clear rules about what agents can/cannot decide (e.g., agents can approve <$10K, must escalate ≥$10K).

**Monitoring & Auditing**: Track all agent decisions, outcomes, and failures for review and course-correction.

**Fail-Safe Modes**: When uncertainty exceeds thresholds, default to human review rather than best-guess autonomous action.

## Accountability Challenge

"Who is liable when an autonomous system causes harm?"
- The developer? (Didn't intend this behavior)
- The organization? (Deployed the system)
- The AI vendor? (Provided the model)
- Unclear, especially in cross-border financial contexts

This unresolved question limits how far banks can push autonomous decision-making in regulated domains.

## Convergence with Other Concepts

- [[agentic-ai]]: Technical capability for autonomous action
- [[governance-frameworks]]: Organizational structures that define autonomy boundaries
- [[regulatory-compliance]]: Legal constraints on what decisions can be autonomous
- [[digital-twin]]: Agents making autonomous decisions within simulated/mirrored systems
