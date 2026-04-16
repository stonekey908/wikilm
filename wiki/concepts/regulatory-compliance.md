---
type: concept
tags: [agentic-ai, governance, banking, risk-management, legal-requirements]
---

# Regulatory Compliance

## Definition

The requirement that systems, decisions, and processes meet legal and regulatory standards. In the context of [[agentic-ai]], this means agents' autonomous actions and decisions must align with laws and regulatory expectations.

## Banking Sector Complexity

Banks operate in some of the most heavily regulated industries globally:
- Capital requirements (Basel III/IV)
- Consumer protection (Know Your Customer, Anti-Money Laundering)
- Lending standards (fair lending laws)
- Data privacy (GDPR, data localization)
- Transaction reporting (CTF, sanctions screening)
- Document retention

When [[agentic-ai]] systems make autonomous decisions, they must satisfy all these constraints.

## The Agentic Compliance Challenge ([[deloitte-agentic-ai-banking]])

**Problem**: Existing compliance frameworks assume **humans** making decisions. Auditors can interview decision-makers, understand reasoning, validate appropriateness.

**With agents**:
- Agent decision-making is often opaque ("black box")
- Traceability may be unclear (which rule fired? which model weight drove the decision?)
- Accountability chains break (is the bank responsible? The vendor? The model builder?)
- Regulators haven't defined what "compliant autonomous decision-making" looks like yet

## Current Workarounds

1. **Smart Overlay**: Wrap agents around processes but keep human approval gates (sacrifices automation benefit)
2. **High-Confidence Threshold**: Agents only decide when confidence >95%; humans handle the rest
3. **Explainability Requirements**: Agents must justify their decisions in human-readable terms
4. **Audit Logging**: Every decision tracked with full context for post-hoc review

All are compromises—technically possible, organizationally cumbersome.

## Regulatory Gaps

The Deloitte article implies unresolved questions:
- What level of agent autonomy is permissible in regulated domains?
- How do regulators measure/audit agent compliance?
- Who is liable if an agent's decision violates a regulation?
- How do cross-border regulations apply to multi-agent systems?

## Strategic Implication

Banks must be "selective" with [[agentic-ai]] deployments, starting with "high-impact, lower-risk use cases"—not regulatory gray zones. JPMorgan's legal agent (92.9% accuracy) is lower-risk than an autonomous lending decision affecting consumer creditworthiness.

## Convergences

- [[agentic-ai]]: What needs to be compliant
- [[autonomous-decision-making]]: The decision authority being regulated
- [[governance-frameworks]]: Organizational structures ensuring compliance
- [[human-oversight]]: Keeping humans in the loop to demonstrate compliance
