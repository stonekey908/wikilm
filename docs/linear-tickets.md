# WikiLM — Linear ticket pack (Aurora frontend & connectivity)

> Ready-to-create tickets for the **WikiLM** project (Stonekey team, key `STO`).
> Generated because the Linear MCP **write** path returns "requires approval" in
> the remote web session and the approval prompt doesn't render here. Create them
> from the Claude desktop app (where the prompt appears) or after enabling write
> access on the Linear connector — or hand this file back to me from such a
> session and I'll create all 9 automatically.

**Project:** WikiLM (`4e810d93-08a1-4d4f-bd3e-fb6c60ba4b7a`)
**Team:** Stonekey (`5412893a-305f-4c4e-942e-67696775f055`)
**Convention:** "Feature — clarifier" titles; Epic with parented children; labels `Frontend` / `Epic` where relevant, otherwise none.
**Related existing:** STO‑1906 (BYO API keys for research providers), STO‑1743 (WikiLM MCP server), STO‑1775 (prior frontend epic).
**PR:** https://github.com/stonekey908/wikilm/pull/1 · **Mockup:** `mockup-perplexity.html` (Aurora) / `mockup.html` (Classic)

---

## EPIC — WikiLM — Aurora frontend & connectivity (MCP · Notion · Tavily · Obsidian)
**Labels:** Epic · **Priority:** High

Epic tracking the new **Aurora** frontend (a clean, search-first / Perplexity-inspired alternative to the editorial UI) and the **connectivity** layer that makes wikiLM controllable from Claude and synced to the tools we already use.

**Context**
- Interactive prototype landed as static mockups: `mockup-perplexity.html` (Aurora) + `mockup.html` (Classic/Nova), switchable via a `Classic ⇄ Aurora` toggle. PR #1.
- Aurora ships a **Connections** surface (replacing the in-app Knowledge Graph) covering Claude API, MCP, Notion, Tavily, Obsidian.
- Brand is **wikiLM** throughout (renamed from "SecondBrain").

**Goals**
- Ship Aurora as a switchable frontend wired to the existing `/api/*` routes.
- Make wikiLM controllable via MCP from Claude Code / Desktop / web + mobile.
- Let wikiLM connect out over MCP to other servers (Notion, Tavily).
- Notion two-way sync so the wiki is readable/editable from Claude web + mobile.
- Bring-your-own Claude API key (Anthropic API instead of a subscription).
- Tavily web search for research, gated on MCP connectivity.
- Obsidian vault export so Obsidian's graph replaces the in-app KG.

**Children:** the 8 tickets below.

---

## 1 — WikiLM — wire the Aurora frontend into the Next.js app as a switchable layout
**Labels:** Frontend · **Priority:** High · **Parent:** Epic

**Context.** The Aurora mockup (`mockup-perplexity.html`) is a complete static prototype. Wire it into `app/` as a selectable layout alongside the existing editorial shell.

**Scope.**
- Add a `data-layout="aurora"` mode in `TweaksProvider` (sits beside the editorial theme system).
- Build Aurora shell / sidebar / topbar / views as React components reusing the existing `/api/*` routes and the markdown renderer.
- Layout switch in Settings; persist to `localStorage`; default unchanged.
- Map mockup views → app routes: Discover, Sources, Wiki, Chat, Jobs, Connections, Settings, Home/Dashboard.

**Acceptance criteria.**
- Toggling layout swaps shells without losing active project context.
- All routes render with live data; streaming answer + citations work against the real API.
- Editorial layout has zero regressions; no duplicated API logic.

**Links.** PR #1 · `mockup-perplexity.html`

---

## 2 — WikiLM — Claude API provider: bring-your-own Anthropic key + model
**Labels:** — · **Priority:** High · **Parent:** Epic · **Related:** STO‑1906

**Context.** Today this leans on a Claude subscription. Let users supply their own **Anthropic API key** and pick a model, used for answers, chat, and synthesis.

**Scope.**
- Connections/Settings UI: masked API-key field + model select + "Test key".
- Provider abstraction: Anthropic-via-key path with subscription fallback when no key is set.
- Secure storage (never logged / never returned to client in full).
- Wire through answer, chat, and synthesis call sites.

**Acceptance criteria.**
- With a valid key, answers/chat/synthesis run via the Anthropic API.
- Without a key, behaviour falls back to the current path.
- Key stored securely; "Test" validates and reports clearly.

---

## 3 — WikiLM — expand the MCP server to control wikiLM from Claude web/mobile
**Labels:** — · **Priority:** High · **Parent:** Epic · **Extends:** STO‑1743

**Context.** `mcp/` already exposes read + additive-write tools (STO‑1743). Expand coverage and make it reachable from Claude **web + mobile**, not just local stdio.

**Scope.**
- New tools: sources (list / preview / approve), research dispatch, sync triggers (Notion / Obsidian), and destructive ops behind preview→confirm pairs.
- Remote/HTTP (or hosted) transport so Claude web + mobile can reach a deployed instance.
- Enforce the `WIKILM_WRITE_TOKEN` path server-side (currently forward-compat only).

**Acceptance criteria.**
- From Claude web/mobile: list/search/read/create wiki content and trigger a sync.
- Destructive ops require explicit confirm.
- Write token enforced on the app side.

---

## 4 — WikiLM — MCP client connectivity: let wikiLM reach external MCP servers
**Labels:** — · **Priority:** Medium · **Parent:** Epic

**Context.** wikiLM should act as an **MCP client** and consume other MCP servers (Notion, Tavily).

**Scope.**
- MCP client + a connections registry (server URL/command, credentials, enabled flag).
- Surface in the Connections UI with health/status.
- Gating: dependent integrations (e.g. Tavily) only available when MCP connectivity is enabled.

**Acceptance criteria.**
- Register/enable a Notion and a Tavily MCP server; their tools become callable in research/sync.
- Connections UI reflects connected/disconnected status.
- Disabling MCP disables dependent integrations.

---

## 5 — WikiLM — Notion two-way sync (read/edit the wiki from Claude web + mobile)
**Labels:** — · **Priority:** High · **Parent:** Epic

**Context.** Sync the wiki ↔ Notion so it's accessible and editable from Claude on web and mobile.

**Scope.**
- Map a project to a Notion database / page tree.
- Push pages (Markdown → Notion blocks) and pull edits back; incremental + "Sync now".
- Direction setting (one-way / two-way); conflict handling; "last synced" indicator.
- Via the Notion API or a Notion MCP server (see ticket 4).

**Acceptance criteria.**
- Edits in wikiLM appear in Notion and vice-versa within a sync cycle.
- Page structure / backlinks preserved; conflicts resolved safely (no data loss).
- Last-synced time shown in Connections.

---

## 6 — WikiLM — Tavily web search for research (gated on MCP connectivity)
**Labels:** — · **Priority:** Medium · **Parent:** Epic · **Related:** STO‑1906

**Context.** Add **Tavily** as a research/search provider, available when MCP connectivity is enabled.

**Scope.**
- Tavily API key in Connections.
- Use in research dispatch + Discover answers; results feed the existing discovered-sources flow.
- Gate on the MCP connectivity toggle.

**Acceptance criteria.**
- With MCP on + key set, research uses Tavily and returns citable results.
- With MCP off, Tavily is greyed/unavailable in the UI.

---

## 7 — WikiLM — Obsidian vault export/sync (Obsidian draws the graph)
**Labels:** — · **Priority:** Medium · **Parent:** Epic · **Related:** ticket 8

**Context.** Instead of an in-app KG, export the wiki as a **linked-Markdown Obsidian vault** and let Obsidian's graph do the work.

**Scope.**
- Configurable vault path.
- Export pages as `.md` with `[[wikilinks]]` + frontmatter; incremental sync + "Export now".
- Map concepts/backlinks → links so the Obsidian graph is meaningful; optional watch for two-way.

**Acceptance criteria.**
- Pages appear in the vault with working wikilinks; Obsidian graph reflects wiki structure.
- Re-export is incremental and non-destructive to user edits.

---

## 8 — WikiLM — remove the in-app Knowledge Graph view
**Labels:** Frontend · **Priority:** Low · **Parent:** Epic · **Related:** ticket 7

**Context.** The in-app KG is removed in Aurora; it's superseded by Obsidian + the Connections surface.

**Scope.**
- Remove the Graph route / nav / components from the editorial app; ensure Aurora has none.
- Redirect or clean up any links to the graph; update docs/screenshots.

**Acceptance criteria.**
- No Graph nav/route remains; no dead code or references.
- Obsidian export is the documented path to a graph view.
