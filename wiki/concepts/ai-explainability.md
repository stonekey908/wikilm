---
type: concept
tags: [explainability, transparency, agentic-ai, governance, regulatory-compliance, banking]
---

# AI Explainability

## Definition

AI explainability (also called interpretability or transparency) refers to the degree to which an AI system's decision-making process can be understood by humans. For [[agentic-ai]] systems making autonomous decisions, explainability is both a technical challenge and a regulatory requirement: regulators need to audit decisions, and accountability chains break down when the reasoning behind a decision cannot be traced.

## Why Explainability Is Non-Negotiable in Regulated Domains

[[regulatory-compliance]] in banking assumes humans make decisions and can be interviewed. When [[agentic-ai]] systems take over decision-making, three accountability problems emerge:

1. **Opacity**: Deep learning models (transformers, neural networks) produce outputs without explicit reasoning traces
2. **Traceability**: "Which rule fired? Which model weight drove the decision?" may be unanswerable from the output alone
3. **Accountability chains**: If a lending decision violates fair lending law, who is responsible — the deploying bank, the vendor, the model builder?

[[deloitte-agentic-ai-banking]] lists "Explainability Requirements: Agents must justify their decisions in human-readable terms" as a current workaround to the compliance gap. It is framed as a compromise — technically possible but organizationally cumbersome.

## Regulatory Context

Different sectors impose different explainability standards:

### Banking
- Fair lending laws require that adverse credit decisions be explainable to consumers (specific reasons for denial)
- AML/KYC decisions must be auditable for sanctions screening and CTF compliance
- EU AI Act classifies high-risk AI systems (credit scoring, employment, biometrics) as requiring human oversight and explainability documentation
- Regulators (FCA, OCC, ECB) are developing autonomous-decision-making frameworks, but standards remain undefined as of 2026

### Healthcare
- Clinical decision support systems face FDA scrutiny
- Patient harm from an unexplainable AI decision raises malpractice liability

### Autonomous Systems
- [[autonomous-vehicles]] face NHTSA/EU type-approval requirements; safety-critical decisions must be documented and defensible
- As [[physical-ai]] systems take physical actions, the stakes of unexplainable failures rise (injury, property damage)

## Technical Approaches

### Post-hoc Explanation Methods
Explain a decision after it has been made, without changing the model:
- **SHAP (Shapley Additive Explanations)**: Attributes prediction to each input feature using game theory
- **LIME (Local Interpretable Model-agnostic Explanations)**: Fits a simple interpretable model locally around a prediction
- **Attention visualization**: Shows which parts of the input the model "attended to"

### Inherently Interpretable Models
Use model architectures that are transparent by design:
- Decision trees, logistic regression, rule-based systems
- Sacrifice some accuracy for interpretability; acceptable for lower-stakes decisions
- "Smart Overlay" approach in banking (from [[deloitte-agentic-ai-banking]]) keeps humans in approval gates — partially substituting for model interpretability

### Audit Logging
Every agent decision is recorded with full context (inputs, outputs, confidence scores, model version). Post-hoc review is possible even if real-time explanation is not.

## Tension with Model Capability

Explainability often trades off against performance:
- The most capable models (large transformers) are least interpretable
- Enforcing strict explainability requirements may constrain which models can be deployed
- This tension is especially acute in banking: the highest-value use cases (complex lending, trading) are also highest-risk and most heavily regulated

[[regulatory-compliance]] frames this as a reason banks should "start with high-impact, lower-risk use cases" — implying explainability constraints currently gate the most powerful applications.

## Relationship to [[Governance-Frameworks]]

Explainability is one component of broader [[governance-frameworks]]:
- Governance defines *what* must be explained and to whom
- Explainability provides the *how* — the technical mechanism for generating justifications
- Without explainability, governance frameworks cannot verify that agents are operating within defined boundaries

## Related Concepts

- [[regulatory-compliance]] — the legal requirement driving explainability in banking and other regulated sectors
- [[governance-frameworks]] — organizational structures that require and consume explainability outputs
- [[agentic-ai]] — the primary domain where explainability gaps are most consequential
- [[autonomous-decision-making]] — the specific decision authority that explainability must account for
- [[human-oversight]] — humans relying on explanations to validate and intervene in agent decisions

## Sources

- [[deloitte-agentic-ai-banking]] — identifies explainability requirements as a current compliance workaround for agentic AI in banking
- [[regulatory-compliance]] — documents the audit and traceability challenges that make explainability necessary
