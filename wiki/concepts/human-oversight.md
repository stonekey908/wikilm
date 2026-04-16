---
type: concept
tags: [agentic-ai, governance, accountability, risk-management, human-ai-collaboration]
---

# Human Oversight

## Definition

The active role of humans in monitoring, validating, and intervening in [[agentic-ai]] systems. Not a passive backup, but an essential control mechanism ensuring accountability and reducing risk.

## Operating Models

**Full Oversight**: Humans approve every decision (defeats automation benefits; impractical at scale).

**Risk-Based Oversight**: Humans monitor all decisions; escalate/intervene only on high-risk outcomes.
- Normal decisions pass through
- Edge cases, high-impact decisions, or low-confidence agents escalate to human review
- Humans can override agent decisions

**Outcome Monitoring**: Humans review agent performance metrics and audit logs post-hoc, intervening if quality degrades.

**Circuit Breaker Model**: Agents operate freely until failure rates exceed threshold, then humans jump in and lock down autonomous behavior.

## Banking Context ([[deloitte-agentic-ai-banking]])

The article explicitly states: "Keep humans in key decision points to help ensure accountability, reduce risks, and bolster organizational resilience."

Implications:
- JPMorgan Chase's LAW achieves 92.9% accuracy, but the other 7.1%+ require human review
- Payment agents can execute transactions up to a threshold; humans approve above
- Legal agents can answer queries but may misinterpret edge cases; humans validate critical decisions

**Not** hands-off automation. **Hands-on** supervision.

## Why Non-Negotiable

**Accountability**: If agent causes harm, but no human was checking, who is liable? Governance breaks down.

**Adaptation**: Agents learn patterns, but markets shift, regulations change, fraud evolves. Humans contextualize and adjust constraints.

**Edge Cases**: Agents optimize for training distribution. Novel situations (market disruptions, unprecedented frauds) need human judgment.

**Trust**: Stakeholders (regulators, customers, boards) don't trust systems without human accountability anchors.

## Organizational Shift

Current model: Humans as decision-makers, systems as executors. Oversight = "did the system do what I told it?"

Agent model: Agents as decision-makers, humans as overseers. Oversight = "are the agent's decisions acceptable? Is it drifting?"

This requires:
- Different skill sets (supervision vs. decision-making)
- Different tools (dashboards, audit logs vs. transaction systems)
- Different culture (respecting agent autonomy while staying vigilant)

## Convergences

- [[agentic-ai]]: What is being overseen
- [[autonomous-decision-making]]: The capability being monitored
- [[governance-frameworks]]: The organizational structure enabling oversight
- [[regulatory-compliance]]: External requirements for oversight adequacy
