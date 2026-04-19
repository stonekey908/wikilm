---
type: concept
tags: [architecture, moe, efficiency, scaling, llm]
---

# Mixture-of-Experts (MoE)

A neural network architecture where a large model is divided into many specialised sub-networks ("experts"), with only a subset activated per token during inference. This allows total parameter counts to scale dramatically while keeping active compute per token constant.

## Why It Matters in 2026

MoE has become the dominant architecture for flagship LLMs. Nearly every major large-scale open-weight model uses it:

- [[meta-ai]] Llama 4 — up to 2T total params
- [[deepseek]] R1/V3.2 — 671B total params
- [[alibaba-qwen]] Qwen 3.5 Max — 235B total params
- [[mistral-ai]] Mistral 3 — 675B total / 41B active
- Kimi K2.5 (Moonshot AI) — 1T total params
- GLM-5 (Z.ai) — 744B total params
- MiMo-V2-Flash (Xiaomi) — 309B total params
- MiniMax M2.5 — 230B total params

As noted in [[sources/best-llms-2026-zapier]], MoE makes direct parameter comparisons across models "impossible" — a 670B MoE model activates far fewer parameters per forward pass than a 70B dense model, yet may outperform it.

## Key Properties

- **Parameter efficiency** — high total capacity, low per-token compute cost
- **Routing** — a learned gating mechanism selects which experts handle each token
- **Inference cost** — close to a smaller dense model despite massive total size
- **Training complexity** — routing instability and expert collapse are known challenges

## Connections

- [[deepseek]] demonstrated that MoE + hardware efficiency can match proprietary models at lower cost
- [[mistral-ai]] has long championed MoE for its active parameter efficiency advantage
- Contrasts with dense transformer architectures used in smaller models like [[microsoft]] Phi
