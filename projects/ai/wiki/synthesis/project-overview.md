---
type: synthesis
tags: [ai, 2026, overview, us-china, regulation, labor, benchmarks, infrastructure, science, llm, moe, reasoning, multimodal]
sources:
  - ai/llms/wiki/synthesis/project-overview.md
---

# AI in 2026 — Project Overview

Cross-cutting synthesis of the `ai` project and its child `ai/llms`. The picture: AI has crossed from hype into consequence, and the LLM layer beneath it has quietly restructured.

## Cross-Cutting Theme 1: The US–China Split Is Structural

Both children document the same divide from different angles. The parent sources (Stanford HAI, MIT TR) frame it geopolitically: China leads in publications and patents; the US leads in compute investment. The [[ai/llms/synthesis/project-overview]] adds the architectural detail — Chinese labs dominate open-weight releases specifically because open-weight is a counter-strategy to Western API-access gatekeeping. [[entities/deepseek]] achieved frontier performance at lower hardware cost than any Western model; [[entities/alibaba]] Qwen 3.5 Max benchmarks at or above Claude 4.6 Opus and Grok 4. The same move — releasing open weights — serves democratization and geopolitical leverage simultaneously.

## Cross-Cutting Theme 2: Benchmarks Are Compromised at Both Layers

[[entities/stanford-hai]] documents 42% error rates and data contamination in frontier benchmarks. The `ai/llms` child notes that benchmark comparisons in trade press are qualitative and self-reported, not peer-reviewed. The problem is systemic: labs self-report capability gains, media amplifies them, and independent verification lags. Claims about which model "leads" are almost certainly not reliable at any given moment.

## The LLM Architecture Story (from `ai/llms`)

[[concepts/mixture-of-experts]] is now the universal large-model architecture — Meta Llama 4 (2T params, sparse), DeepSeek V3.2 (671B), Mistral 3 (675B / 41B active), Qwen 3.5 Max (235B). Raw parameter counts no longer mean anything; active compute per token does. [[concepts/reasoning-models]] shifted from breakthrough to table stakes — extended chain-of-thought is present in every flagship proprietary and open-weight release. Context window leaders sit at 1–2M tokens; practical utility of extreme context is unresolved. Text + vision multimodality is now standard in proprietary models and emerging in open-weight. Small models (Phi 3B–15B, Gemma 270M–27B) serve edge and local deployment.

## What's Actually Breaking Through

[[concepts/ai-for-science]] remains the area of least hype and most genuine progress. [[entities/google-deepmind]]'s AlphaEvolve produced real algorithmic discoveries — a qualitative leap from pattern matching to discovery. Drug discovery and mathematics are producing results. Embodied AI completes 12% of household tasks; progress is narrow and deep, not broad.

[[concepts/agentic-commerce]] is the near-term commercial vector: AI as purchasing agent, projected at $263B for the 2026 holiday season and $3–5T by 2030.

## Consequences That Are Already Here

**Labor**: Software developer employment (ages 22–25) dropped 20% from 2022–2026. Junior roles first. Both this project's sources treat displacement as present tense, not future risk.

**Regulation**: No coherent global frame. EU AI Act active; US states legislating independently; federal posture deregulatory. [[concepts/ai-legal-liability]] — output-harm liability (OpenAI teen chatbot lawsuit) — is the emerging pressure point beyond copyright disputes.

**Infrastructure**: 29.6 GW global data center draw, 5,427+ US centers. Energy and water footprints growing faster than efficiency gains. A physical constraint on the pace of scaling.

## Contradictions

- **Benchmark wins vs. benchmark validity**: Every lab touts leaderboard positions that Stanford HAI and the `ai/llms` trade-press analysis both show are methodologically compromised.
- **Open-weight democratization vs. geopolitical leverage**: The same release serves both narratives simultaneously.
- **US deregulation vs. state-level fragmentation**: Federal pullback creates 50 parallel regulatory experiments, not deregulation.

## Gaps Across All Children

- No source on AI safety, alignment, or red-teaming approaches
- Training costs and energy comparisons uncovered — `ai/llms` flags this; parent infrastructure section is demand-side only
- Fine-tuning ecosystems (LoRA, PEFT, quantisation) unexplored
- Chinese domestic regulatory environment for AI absent
- Healthcare and education outcomes at scale absent
- Agentic commerce fraud, consent, and returns handling absent
- Audio/video modalities in multimodal LLMs mentioned but not examined
