---
type: concept
tags: [subprocess, cli-tools, non-interactive, automation, engineering-patterns]
---

# Non-Interactive Subprocess Flags

CLI tools are designed for humans at terminals. When invoked from code, they assume a `tty` and may block on prompts the invoking code can't see or answer. The subprocess hangs forever; the parent times out or deadlocks.

**"Works in my terminal" does not mean "works from code."**

## What to Audit

Every CLI invoked from code needs explicit non-interactive invocation. Flags to look for:

| Flag type | Examples |
|---|---|
| Non-interactive / batch mode | `--no-interactive`, `--batch`, `-y`, `--yes` |
| Auto-approve tool use | `--allowedTools`, `-y` (yolo) |
| Output format | `-o text`, `--output json`, `--no-color` |
| Disable progress bars | `--quiet`, `--silent` |

Read the tool's flags page — don't guess.

## Detection Strategy

Test with **no stdin attached** and a **short timeout** the first time you spawn a CLI from code. Hangs manifest immediately in this setup rather than surfacing in production after a timeout expires.

When a tool version bumps, **re-verify** — new prompts get added across versions.

## WikiLM Incidents

**Claude CLI:** `claude -p` prompted for write-permission approval and hung. Fixed by adding `--allowedTools "Write" "Edit" "Read" "WebSearch" "WebFetch"` to spawn args.

**Gemini CLI:** needed `-y` (yolo mode, auto-approve tool use) + `-o text` (deterministic text output). Without these, every Gemini subprocess hung waiting for stdin approval.

Both flags now live in the subprocess spawn args in [[wikilm]]'s `claude-runner.ts`.

## Related Concepts

- [[subprocess-cwd-discipline]] — the other half of "invoking subprocesses correctly"
- [[provider-prefix-dispatch]] — determines which CLI gets spawned and thus which flags apply

## Source

[[engineering-lessons-from-building-wikilm]]
