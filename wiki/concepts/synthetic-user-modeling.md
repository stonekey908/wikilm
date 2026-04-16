---
type: concept
tags: [AI, user-research, generative-AI, simulation, digital-twin, UX-research]
---

# Synthetic User Modeling

## Definition

Creating computational models that simulate how a user (or population segment) would respond to questions, design changes, or situations. Models can operate at two levels:

1. **Individual-level** — Digital twins trained on extensive personal data to predict a specific person's responses
2. **Segment-level** — Synthetic users representing archetypal profiles or population segments without individual-specific training data

## Motivation

Traditional UX research is time-consuming, expensive, and often reaches the same participants repeatedly, causing survey fatigue and attrition. Synthetic user models offer:

- **Speed**: Generate predictions in seconds vs. weeks of recruiting and running studies
- **Scale**: Model thousands of individuals without requiring their direct participation
- **Cost reduction**: Reduce reliance on repeated user testing across design iterations
- **Accessibility**: Model hard-to-reach populations without repeated recruitment burden

## Technical Approaches

Per [[nngroup-digital-twins-generative-ai]], three main construction methods:

1. **Prompt Augmentation** — Embed personal context directly in LLM prompts (simple, limited by token length)
2. **Retrieval-Augmented Generation** — Store individual data externally, dynamically retrieve relevant context (balanced approach)
3. **Fine-tuning** — Retrain foundation models on individual datasets (highest fidelity, most resource-intensive)

## Limitations and Constraints

- **Behavior complexity**: Cannot fully capture contradictions, emotional factors, or context-dependent preferences
- **Data quality**: Model accuracy depends on quantity and quality of training data; degrades for novel situations outside training distribution
- **Bias amplification**: Training data biases can be amplified when creating individual models
- **Behavioral validity**: Current AI simulations fail to capture the "messy, nuanced nature of real human behavior"

## Use Cases

- Predicting missing survey responses
- Shortening surveys by inferring unstated answers
- Anticipating user reactions to design changes
- Modeling hard-to-reach populations
- Simulating population-level responses by aggregating individual predictions

## Ethical Considerations

Key unresolved questions when deploying synthetic user models:

1. **Informed consent**: Should participants know their digital twin exists? For what uses do they consent?
2. **Scope limitation**: What prevents using a synthetic model beyond its original research intent?
3. **Privacy and data governance**: How are personal data protected after the research project ends?
4. **Transparency**: Should findings be attributed to synthetic predictions or presented as empirical research?

## Related Concepts

- [[digital-twin]] — individual-level synthetic models; human-centric application of digital twin concept
- [[retrieval-augmented-generation]] — core technique for dynamic personal data retrieval
- [[agentic-ai]] — autonomous agents could use synthetic user models to anticipate user reactions
- [[generative-ai]] — foundation technology enabling these simulations

## Sources

- [[nngroup-digital-twins-generative-ai]] — NN/g article on individual-level digital twins for UX research
