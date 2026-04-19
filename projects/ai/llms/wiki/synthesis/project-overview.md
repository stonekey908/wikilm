---
type: synthesis
tags: [llm, landscape, 2026, open-source, proprietary, moe, reasoning, multimodal, geopolitics]
sources:
  - sources/best-llms-2026-zapier.md
---

# LLM Landscape — Project Overview

A two-minute orientation to everything this wiki knows about large language models as of 2026.

## The Big Picture

The LLM field in 2026 is defined by three converging forces, all documented in [[sources/best-llms-2026-zapier]]: open models have caught up to proprietary ones, [[concepts/mixture-of-experts]] has become the universal architecture for large models, and [[concepts/reasoning-models]] are now expected in every flagship release rather than celebrated as a breakthrough.

## Key Structural Dynamics

**Geographic divide** — Western labs dominate proprietary: [[entities/openai]] (GPT-5.4), [[entities/anthropic]] (Claude 4.7), [[entities/google-deepmind]] (Gemini 3.1), [[entities/xai]] (Grok 4), [[entities/cohere]] (Command A). Chinese labs dominate open-weight: [[entities/deepseek]] (R1/V3.2), [[entities/alibaba-qwen]] (Qwen 3.5), plus Moonshot, MiniMax, Xiaomi, Z.ai. This split appears strategic: open-weight releases are a competitive and political counter to Western API-access gatekeeping.

**Open = proprietary** — [[entities/alibaba-qwen]] Qwen 3.5 Max benchmarks at or above Claude 4.6 Opus and Grok 4. [[entities/deepseek]] achieved frontier performance at lower hardware cost than any Western model. The proprietary premium is shrinking.

**[[concepts/mixture-of-experts]] dominance** — virtually every large 2026 model is MoE: [[entities/meta-ai]] Llama 4 (2T total params), [[entities/deepseek]] V3.2 (671B), [[entities/mistral-ai]] Mistral 3 (675B / 41B active), [[entities/alibaba-qwen]] Qwen 3.5 Max (235B). Raw parameter counts are no longer a useful comparison metric — active compute per token is what matters.

**[[concepts/reasoning-models]] as table stakes** — extended chain-of-thought inference is present in [[entities/openai]] GPT-5.4, [[entities/anthropic]] Claude 4.7, [[entities/xai]] Grok 4 on the proprietary side; and [[entities/deepseek]] R1, [[entities/alibaba-qwen]] Qwen 3.5 Max, GLM-5, Kimi K2.5 on the open side. Latency cost remains the trade-off.

**Context window race** — [[entities/xai]] Grok 4 leads at 2M tokens; [[entities/google-deepmind]] Gemini 3.1 and Amazon Nova 2 at 1M. Practical utility of extreme context is an open question.

**[[concepts/multimodal-llms]]** — text + vision is standard in proprietary models; emerging in open-weight (Llama 4 is multimodal).

**Small models** — [[entities/microsoft]] Phi (3B–15B) and [[entities/google-deepmind]] Gemma 3 (270M–27B) serve edge/local use cases. Some Phi variants support reasoning.

## Contradictions & Tensions

The source praises [[entities/deepseek]]'s efficiency but the benchmark comparisons it cites are from Zapier's own testing, not independent peer-reviewed evaluations. Qwen 3.5 Max's claim to "match or exceed" GPT-5.4 and Claude 4.6 Opus is from the same article — the claim deserves scrutiny from additional sources.

## Knowledge Gaps

- No source yet on training costs, energy consumption, or carbon footprint comparisons
- No coverage of fine-tuning ecosystems or tooling (LoRA, PEFT, quantisation)
- Enterprise adoption data is anecdotal (Slack/Notion/Zoom for Claude; no equivalent for others)
- Benchmark methodology is not examined — Zapier's evaluation criteria are qualitative
- No coverage of model safety, alignment, or red-teaming approaches
- Audio/video modalities in [[concepts/multimodal-llms]] are mentioned but not examined
