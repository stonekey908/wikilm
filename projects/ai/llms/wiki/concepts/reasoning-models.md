---
type: concept
tags: [reasoning, inference, chain-of-thought, llm, capability]
---

# Reasoning Models

LLMs that perform extended internal computation before producing an answer — often called "thinking" or "chain-of-thought" at inference time. This trades latency for accuracy on tasks that require multi-step logic: coding, mathematics, science, and complex planning.

## How They Work

Rather than generating a direct reply, reasoning models emit a long sequence of intermediate tokens (the "scratchpad") before the final answer. This is analogous to a human showing their working. The scratchpad is typically hidden from users but consumes compute.

## 2026 Landscape

Reasoning capability has become table stakes for flagship models, per [[sources/best-llms-2026-zapier]]:

**Proprietary with reasoning:**
- [[openai]] GPT-5.4
- [[anthropic]] Claude 4.7
- [[xai]] Grok 4
- [[openai]] gpt-oss

**Open-weight with reasoning:**
- [[deepseek]] R1
- [[alibaba-qwen]] Qwen 3.5 (Max tier)
- GLM-5 (Z.ai)
- Kimi K2.5 (Moonshot AI)
- MiniMax M2.5
- [[microsoft]] Phi (some variants)

## Trade-offs

| Benefit | Cost |
|---|---|
| Higher accuracy on complex tasks | Higher latency |
| Better at coding and math | Higher token usage / cost |
| Reduces hallucination on logic tasks | Not needed for simple queries |

## Connections

- [[deepseek]] R1 brought reasoning capability to open-weight models at frontier quality
- Often paired with [[mixture-of-experts]] architecture in 2026 flagships
- [[multimodal-llms]] are starting to combine reasoning with vision inputs
