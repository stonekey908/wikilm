---
type: concept
tags: [agentic-ai, ai-systems, automation, decision-making, agent-architecture]
---

# Agentic AI

## Definition

AI systems with **agency**—the autonomous ability to take initiative, reason independently, plan actions, execute them toward defined outcomes, and adapt in real time with minimal human supervision.

Core capabilities:
- **Autonomous reasoning**: Can break down complex goals into sub-tasks
- **Action execution**: Can take real-world actions (API calls, database updates, system interventions)
- **Adaptation**: Can adjust strategy based on feedback and outcomes
- **Limited supervision**: Can operate without constant human intervention

## Architecture & Techniques

Built on [[retrieval-augmented-generation]] (RAG) and large language models, agentic systems combine:
- LLM backbone for reasoning
- Knowledge retrieval systems (RAG) to ground decisions in data
- Action interfaces (APIs, tools) to execute decisions
- Feedback loops for real-time adaptation
- Monitoring/oversight layers for safety

## Distinction from Traditional Automation

| Traditional (RPA) | Agentic |
|---|---|
| Rule-based execution | Learned reasoning |
| Fixed decision trees | Dynamic adaptation |
| Reactive (respond to triggers) | Proactive (take initiative) |
| Human designs all workflows | Agent designs task breakdown |
| High supervision required | Minimal supervision required |

## Current Applications

**Financial Services** ([[deloitte-agentic-ai-banking]]):
- JPMorgan Chase's LAW (Legal Agentic Workflows) — 92.9% accuracy on legal queries
- BNY Mellon — coding, payment validation
- [[mastercard]], [[paypal]] — agentic commerce experiments

**Tech Platform Integration**:
- [[amazon-bedrock]]
- [[salesforce-agentforce]]
- Google Agents
- Microsoft Copilot agents
- Nvidia frameworks

## Implementation Approaches

1. **Smart Overlay**: Wrap agents around existing processes (lowest risk, preserves safeguards)
2. **Agentic by Design**: Build new applications from scratch (moderate risk)
3. **Process Redesign**: Overhaul workflows to maximize agent capability (highest risk, greatest reward)

## Critical Challenges

**Governance**: Maintaining [[human-oversight]] in agent-driven decisions. Risk of "rogue" behaviors causing financial/operational harm.

**Regulatory Compliance**: Banking, healthcare, legal domains require [[regulatory-compliance]] frameworks not yet established for autonomous agents.

**Reliability**: Model errors, hallucinations, unintended side effects when agents operate at scale.

**Accountability**: Who is responsible when an autonomous system causes harm?

**Organizational Readiness**: Requires cultural shift from human-centric task execution to "AI agents take central role, humans guide/oversee." Many processes need major redesign.

## Strategic Implications

- Not imminent enterprise-wide but inevitable in specialized domains
- Success requires combining technical capability with organizational [[governance-frameworks]]
- Should start with "high-impact, lower-risk use cases" not full deployment
- Human judgment remains non-negotiable at critical decision points

## Agent Training Environments

[[genie-3]] provides procedurally-generated environments for training agentic AI systems like [[sima-agents]], enabling scalable policy learning without real-world risk.

## Future Convergence

Agents are a key ingredient in [[enterprise-metaverse]]—interconnected autonomous systems making real-time decisions across networked digital twins.
