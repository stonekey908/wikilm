---
type: concept
tags: [llm, software-development, knowledge-sharing]
---

# Idea Files

A concept articulated by [[andrej-karpathy]]: instead of sharing specific code or applications, share the *idea* as a specification that another person's LLM agent can customize and build for their specific needs.

## Origin

Karpathy published his [[llm-wiki-pattern]] architecture as a GitHub gist — not as a working application, but as a detailed specification designed to be pasted directly into an LLM agent.

His reasoning: *"In this era of LLM agents, there is less of a point/need of sharing the specific code/app, you just share the idea, then the other person's agent customizes & builds it for your specific needs."*

## Implications

- Code becomes an implementation detail; the valuable artifact is the specification
- Each person gets a version tailored to their tools, preferences, and stack
- The schema/spec (like `CLAUDE.md`) becomes the primary shareable unit
- Shifts open source from "fork and modify code" to "share the idea, let agents build it"

## Sources

- [[karpathy-second-brain-medium-article]]
