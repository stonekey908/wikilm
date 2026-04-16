---
type: source
title: "Digital Twins: Simulating Humans with Generative AI"
author: "Nielsen Norman Group"
date: "2026-04-16"
url: "https://www.nngroup.com/articles/digital-twins/"
domain: "nngroup.com"
source_file: "fetched from web"
tags: [digital-twin, generative-AI, simulation, human-modeling, UX-research, synthetic-users]
---

# Digital Twins: Simulating Humans with Generative AI

## Overview

Nielsen Norman Group examines how generative AI enables creating digital representations of humans—specifically individual-level AI models trained on personal data to predict how that person would respond to questions, design changes, or situations. This contrasts sharply with [[digital-twin]] applications in physical assets (machines, buildings) by focusing on human behavior prediction.

## Key Definitions

**Digital Twin (Human-Centric)**: An AI model representing a specific individual that predicts how that person would respond to questions or situations, built from extensive personal data. Distinct from synthetic users, which represent population segments rather than specific individuals.

## Construction Methods

Three technical approaches for building human digital twins:

1. **Prompt Augmentation**
   - Adding personal context directly to the LLM prompt
   - Simplest approach but limited by prompt length constraints
   - Best for small datasets

2. **Retrieval-Augmented Generation (RAG)**
   - Store individual data externally, retrieve relevant information dynamically
   - Overcomes prompt-length limitations
   - Balances simplicity with scalability
   - See [[retrieval-augmented-generation]] for technique details

3. **Fine-tuning**
   - Retraining models on domain-specific datasets
   - Most resource-intensive approach
   - Highest fidelity but requires significant compute and data

## Use Cases in UX Research

- **Survey completion prediction**: Filling missing survey responses by inferring unstated answers from individual patterns
- **Survey shortening**: Reducing survey length by predicting responses to unasked questions
- **Hard-to-reach populations**: Modeling populations difficult to access repeatedly over time
- **Design validation**: Anticipating user reactions to design changes without running full user tests
- **Population simulation**: Aggregating individual predictions to simulate population-level responses

## Critical Limitations

The article emphasizes that current AI simulations **fail to capture the messy, nuanced nature of real human behavior**. While digital twins show more promise than generic synthetic users, significant constraints remain:

- Cannot fully model contradictions, context-dependent preferences, or emotional factors
- Requires substantial personal data to build accurate models
- Predictions degrade for novel situations outside training data distribution

## Ethical and Privacy Concerns

Key unresolved questions:

1. **Consent**: How should consent work when reusing participant data long-term or for applications beyond original intent?
2. **Misuse prevention**: What prevents using a person's digital twin beyond the original research scope?
3. **Bias amplification**: How are training-data biases amplified when creating individual models?
4. **Transparency**: Should research participants know their digital twin exists and how it's being used?

## Conclusion

Digital twins could enhance UX research efficiency by reducing the need for repeated user testing and enabling rapid iteration cycles. However, implementation requires **careful governance** around [[transparency]], [[privacy]], and fairness to mitigate ethical risks. Not a replacement for actual user research, but a complementary tool when deployed responsibly.

## Related Concepts

- [[synthetic-user-modeling]] — broader category of simulating user behavior; digital twins as individual-level approach
- [[digital-twin]] — physical-asset focus vs. human-centric application
- [[agentic-ai]] — AI systems making autonomous decisions; human digital twins could inform agent behavior
- [[retrieval-augmented-generation]] — core technique for dynamic personal data retrieval

## Related Sources

- [[mckinsey-what-is-digital-twin-technology]] — physical-asset-focused digital twins
- [[karpathy-second-brain-medium-article]] — LLM systems for knowledge organization
