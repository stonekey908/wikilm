---
type: concept
name: "Adversarial RAG Attacks"
tags: [rag, security, adversarial, robustness, llm, poisoning, backdoor]
---

# Adversarial RAG Attacks

A class of attacks targeting [[retrieval-augmented-generation]] systems by manipulating the retrieval corpus or retrieval representations to steer model outputs toward attacker-controlled content. Because RAG systems explicitly condition generation on retrieved documents, a compromised retrieval layer directly compromises the generator's output — even if the underlying LLM is unmodified.

## Attack Types

### Corpus Poisoning (BadRAG)
An attacker injects adversarially crafted passages into the retrieval corpus. These passages act as semantic backdoors: when a trigger query is issued, the poisoned passage ranks highly and steers generation toward the attacker's intended output.

**Key finding:** BadRAG achieves **98.2% attack success rate** with only **0.04% corpus corruption** — meaning a tiny fraction of poisoned documents can reliably control outputs on targeted queries.

### Embedding-Level Backdoors (TrojanRAG)
Rather than poisoning document content, TrojanRAG embeds triggers directly into the retrieval representations (embeddings). This bypasses traditional content-level sanitization because the manipulation is invisible at the text layer — it only activates when the embedding-space trigger pattern is present.

**Key finding:** Embedding-level backdoors evade traditional sanitization methods, representing a qualitatively different threat surface.

### Retrieval Noise (Passive)
Not all adversarial retrieval is intentional. Noisy, irrelevant, or counterfactual documents in the corpus degrade output quality passively. Benchmarks like **RGB** evaluate:
- Noise robustness
- Negative rejection (refusing to answer when context is insufficient)
- Information integration (combining evidence correctly)
- Counterfactual resistance (not being misled by plausible-but-wrong context)

## Why RAG Is Uniquely Vulnerable

Standard LLMs are hardened at the model level (RLHF, safety training). RAG introduces a runtime dependency on external, potentially untrusted content. This creates:
- A new attack surface that bypasses model-level defenses
- High leverage: small corpus modifications → large output influence
- Difficulty of attribution: poisoned content looks like normal retrieved text to downstream consumers

## Defenses and Mitigations

Current defenses are limited and remain an open research area:

- **RAAT** — adversarial pretraining classifying passages as relevant/irrelevant/counterfactual; improves F1/EM 20–30% on noisy inputs
- **CRAG** — inference-time evidence quality evaluation; reduces retrieval errors 12–18%
- **Bottleneck Noise Filtering** — information bottleneck compression to minimal high-utility representations
- **Structured RAG** — retrieval from curated, sanitized corpora reduces [[hallucination-in-llms]] 30–40%

No current system fully defends against BadRAG-style attacks with high-precision triggers.

## Open Challenges

- Defense against group-triggered semantic attacks (trigger is a distributed pattern, not a single token)
- Robustness against contextually plausible yet misleading passages
- Corpus integrity verification at scale
- Privacy-preserving retrieval that doesn't expose the corpus to inference attacks

## Relation to Hallucination

Adversarial attacks can be thought of as intentional [[hallucination-in-llms]] induction — where the attacker uses the retrieval mechanism as a reliable channel for injecting false premises into the generator's context.

## Sources

- [[rag-comprehensive-survey-2506-00054]] — §3.4 (robustness-oriented systems), §4.4 (robustness enhancements), §7.2 (future adversarial defense directions)
