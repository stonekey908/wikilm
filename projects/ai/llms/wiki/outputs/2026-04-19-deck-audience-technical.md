---
type: output
output_type: deck
generated_at: "2026-04-19"
scope: project
project_slug: "ai/llms"
tags: [output, deck]
marp: true
theme: default
paginate: true
---

# LLM Landscape 2026
### A technical briefing: architecture shifts, open-weight parity, and what comes next

---

## The Story in Five Points

- MoE has displaced dense transformers as the default architecture at scale
- Open-weight models now benchmark at or above proprietary flagships
- Western labs ship APIs; Chinese labs ship weights — the split is strategic
- Extended chain-of-thought reasoning is expected in every 2026 flagship
- Active compute per token has replaced total parameter count as the comparison unit

---

## Mixture-of-Experts Is the Dominant Architecture

- Only a learned subset of "experts" activates per token — not the full network
- Llama 4: 2T total params; DeepSeek V3.2: 671B total / ~37B active
- Mistral 3: 675B total / 41B active — 16× parameter leverage over inference cost
- A 671B MoE model can outperform a 70B dense model at comparable inference cost

*[[concepts/mixture-of-experts]]*

---

## Open-Weight Has Reached Proprietary Quality

- Qwen 3.5 Max benchmarks at or above Claude 4.6 Opus and Grok 4
- DeepSeek achieved frontier performance at lower hardware cost than any Western model
- Meta Llama 4 is MoE, multimodal, and fully open-weight — simultaneously
- Source caveat: benchmark claims are single-source (Zapier); independent validation pending

*[[entities/deepseek]], [[entities/alibaba-qwen]], [[concepts/llm-landscape-2026]]*

---

## The Geographic Divide Is Strategic, Not Incidental

- **West → proprietary APIs**: OpenAI, Anthropic, Google DeepMind, xAI, Cohere
- **China → open-weight releases**: DeepSeek, Qwen, Kimi, MiniMax, MiMo, GLM
- Open-weight functions as a competitive counter to Western API-access gatekeeping
- Both sides are at frontier quality — this is distribution strategy, not a capability gap

*[[entities/deepseek]], [[entities/alibaba-qwen]], [[concepts/llm-landscape-2026]]*

---

## Reasoning Is Now Table Stakes

- Extended chain-of-thought ("thinking") inference ships in every 2026 flagship
- Proprietary: GPT-5.4, Claude 4.7, Grok 4 all include reasoning modes
- Open-weight: DeepSeek R1, Qwen 3.5 Max, GLM-5, Kimi K2.5 reason out of the box
- Trade-off: higher accuracy on coding and math at the cost of latency and token spend

*[[concepts/reasoning-models]]*

---

## Context Windows and Multimodal Are Widening

- xAI Grok 4 leads at 2M tokens; Gemini 3.1 and Amazon Nova 2 at 1M tokens
- Practical utility of extreme context in production is an open engineering question
- Text + vision is standard across proprietary flagships; Llama 4 brings it to open-weight
- Audio and video modalities are present but not deployed at production scale

*[[entities/xai]], [[entities/google-deepmind]], [[entities/meta-ai]], [[concepts/multimodal-llms]]*

---

## Small Models Hold the Edge Tier

- Microsoft Phi (3B–15B) and Google Gemma 3 (270M–27B) target on-device inference
- Some Phi variants ship with reasoning — capable CoT at small scale is new in 2026
- On-device avoids network latency, API cost, and data-egress constraints
- Dense architecture remains appropriate here — MoE routing overhead does not pay at small scale

*[[entities/microsoft]], [[entities/google-deepmind]]*

---

## Open Questions

- How do models compare when active compute per token is held constant across MoE vs dense?
- What is the real utility ceiling of 1M–2M token context in production workloads?
- Where are independent benchmark evaluations of Qwen 3.5 Max and DeepSeek V3.2?
- How does fine-tuning (LoRA, PEFT, quantisation) interact with MoE expert routing?
- What safety and alignment practices do Chinese open-weight releases employ?

---

## Takeaway

> **Active compute per token — not raw parameter count — is the only comparison unit that matters in 2026. Open-weight models now live at the frontier.**

Reference: [[synthesis/project-overview]]
