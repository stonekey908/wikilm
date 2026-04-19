---
type: concept
tags: [multi-provider, dispatch, abstraction, engineering-patterns, llm]
---

# Provider-Prefix Dispatch

When supporting multiple providers (LLMs, search engines, storage backends), you can branch at every call site or branch once at a single boundary. **Branch at every call site** is a trap — every new call site is another place to forget the new provider.

## The Pattern

Encode provider + model in a single string with a naming convention:

| String | Provider |
|---|---|
| `"sonnet"` | Claude (bare alias) |
| `"ollama:<model>"` | Ollama HTTP |
| `"gemini:<model>"` | Gemini CLI |

A single dispatch function parses the prefix and returns a provider-neutral interface. All callers use that interface; the branching lives in one place.

## The Failure Mode

Without this, provider-specific code accumulates across files. When a new provider is added, each call site that wasn't updated silently no-ops — no error, just nothing.

In [[wikilm]], `streamClaude` was hardcoded to spawn `claude` regardless of the configured model. When Gemini was added, the research flow produced empty results. Users assumed Gemini was broken; in reality it was never called.

## Unsupported Providers Should Error Loudly

The dispatch layer should emit a **structured error** when a provider isn't implemented yet — not silently no-op. WikiLM's Ollama streaming path emits "not supported yet" explicitly.

## Why Prefix Beats Bare Aliases

Bare aliases (`"sonnet"`, `"gemini"`) get ambiguous as the model list grows. A prefix (`"ollama:llama3.2"`) is trivially parseable with a `split(":")` and can't collide with another provider's namespace.

## Related Concepts

- [[burst-coalescing]] — coalesced jobs pass through this dispatch layer
- [[subprocess-cwd-discipline]] — the subprocess spawned after dispatch must use the right `cwd`
- [[non-interactive-subprocess-flags]] — each provider's CLI needs different non-interactive flags

## Source

[[engineering-lessons-from-building-wikilm]]
