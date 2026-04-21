# WikiLM — LLM Wiki Schema

You are maintaining a personal knowledge base (wiki) for the user. This wiki follows the Karpathy LLM Wiki pattern: raw sources go in, structured interlinked markdown comes out.

## Architecture

```
WikiLM/
  raw/          # Source material — NEVER modify. Read-only for the LLM.
  wiki/         # LLM-maintained markdown files. The LLM owns this layer entirely.
    index.md    # Master catalog of all wiki pages, organized by category
    log.md      # Chronological record of all operations (ingest, query, lint)
```

## Core Rules

1. **Never modify files in `raw/`** — this is the source of truth. Read from it, never write to it.
2. **The LLM owns `wiki/`** — create, update, and maintain all wiki pages. The user reads; you write.
3. **Everything is markdown** — plain `.md` files with YAML frontmatter. No databases, no embeddings, no vector stores.
4. **Knowledge compounds** — every ingest, every query answer worth keeping, every connection discovered gets filed into the wiki.
5. **Always update `index.md` and `log.md`** after any operation.

## Page Types

### Source Summaries
One per raw source. Filename: `wiki/sources/{slugified-source-title}.md`
```yaml
---
type: source
title: "Original title"
author: "Author name"
date: "YYYY-MM-DD"
source_file: "raw/filename.ext"
tags: [topic1, topic2]
---
```
Contains: key takeaways, important claims, notable quotes, relevance to other wiki pages. Link to related entity/concept pages with `[[wikilinks]]`.

### Entity Pages
People, organizations, products, projects. Filename: `wiki/entities/{entity-name}.md`
```yaml
---
type: entity
entity_type: person | organization | product | project
tags: [topic1, topic2]
---
```
Contains: who/what they are, key facts, what sources mention them, how they connect to other entities and concepts.

### Concept Pages
Ideas, methods, theories, frameworks, patterns. Filename: `wiki/concepts/{concept-name}.md`
```yaml
---
type: concept
tags: [topic1, topic2]
---
```
Contains: explanation, how different sources treat this concept, connections to other concepts, practical implications.

### Comparison Pages
Side-by-side analysis of competing ideas, tools, or approaches. Filename: `wiki/comparisons/{comparison-name}.md`
```yaml
---
type: comparison
items: ["Item A", "Item B"]
tags: [topic1, topic2]
---
```

### Synthesis Pages
Overviews that tie multiple sources together around a theme. Filename: `wiki/synthesis/{theme-name}.md`
```yaml
---
type: synthesis
sources: ["source1.md", "source2.md"]
tags: [topic1, topic2]
---
```

### Query Pages
Answers to questions that are worth preserving. Filename: `wiki/queries/{slugified-question}.md`
```yaml
---
type: query
question: "The original question"
date: "YYYY-MM-DD"
tags: [topic1, topic2]
---
```

## Operations

### Ingest
When the user adds new material to `raw/` and asks you to process it:

1. Read the source material completely
2. Discuss key takeaways with the user (unless they say to just process it)
3. Create a source summary page in `wiki/sources/`
4. Identify entities — create new entity pages or update existing ones
5. Identify concepts — create new concept pages or update existing ones
6. Look for connections, contradictions, or reinforcements with existing wiki content
7. Add `[[wikilinks]]` throughout — both in the new pages and in existing pages that should now link to the new content
8. Update `wiki/index.md` with new pages
9. Append to `wiki/log.md`

A single source typically touches 5-15 wiki pages. Be thorough.

### Query
When the user asks a question against the wiki:

1. Read `wiki/index.md` to find relevant pages
2. Read the relevant wiki pages
3. Synthesize an answer with citations to specific wiki pages
4. If the answer is substantial or represents a new insight, offer to file it as a query page in `wiki/queries/`
5. If the answer reveals gaps, suggest sources to look for

### Lint
When the user asks for a health check (or periodically suggest it):

1. Scan for orphan pages (no inbound links from other pages)
2. Check for contradictions between pages
3. Find concepts mentioned frequently but lacking their own page
4. Identify stale claims that newer sources may have superseded
5. Check for missing cross-references
6. Suggest new questions to investigate or sources to find
7. Report findings and fix what you can, flag what needs user input
8. Log the lint pass in `wiki/log.md`

## Wikilinks

Use `[[page-name]]` syntax for internal links (Obsidian-compatible). When referencing another wiki page, always link it. This builds the graph of connections that makes the wiki valuable.

## Index Structure

`wiki/index.md` is organized by category:
```markdown
# Wiki Index

## Sources
- [[source-page]] — one-line summary

## Entities
- [[entity-page]] — one-line summary

## Concepts
- [[concept-page]] — one-line summary

## Comparisons
- [[comparison-page]] — one-line summary

## Synthesis
- [[synthesis-page]] — one-line summary

## Queries
- [[query-page]] — one-line summary
```

## Log Format

Each entry in `wiki/log.md` starts with a consistent prefix for parseability:
```markdown
## [YYYY-MM-DD] operation | Title
Details of what was done.
```

Operations: `ingest`, `query`, `lint`, `update`

## Multi-Topic Support

This is a general-purpose knowledge base. Topics are handled via tags in frontmatter rather than rigid folder hierarchies. The index and tag system allow any topic to coexist. When topics grow large enough, suggest creating a synthesis page that ties together everything the wiki knows about that topic.

## Quality Standards

- Every wiki page must have YAML frontmatter with at least `type` and `tags`
- Every page must link to at least one other page (no orphans)
- Source summaries must cite the specific raw file they summarize
- Claims should be traceable back to a source
- When sources contradict each other, note the contradiction explicitly rather than silently picking a side

## Current Phase

**v1.5-beta shipped to `main`.** `feat/editorial-frontend` merged as a non-ff merge commit at `4677548` and tagged `v1.5-beta`. Pre-merge main is preserved at tag `v1-alpha` (commit `2687d13`). Both tags pushed.

What v1.5-beta carries over v1-alpha:
- Full editorial-brutalist UI (themes/accents/densities/faces/sizes, ⌘K palette, hover preview cards via portal + rAF, visible `?` help icon in topbar)
- Multi-provider model routing per job type (Claude aliases + explicit IDs, Gemini preview models, Ollama local) with live availability pings
- Structured error classification: `provider_unavailable` / `model_not_found` / `rate_limited` / `auth_failed` — rendered via `formatJobError` across /jobs + /compose
- Research Ollama guard (UI disables + endpoint hard-blocks — no web grounding)
- Inline PNG preview + "Open interactive HTML" button on infographic output pages; ext pills force download
- `scripts/capture-screenshots.mjs` — puppeteer-core rig that shoots all 13 README screenshots at 1440×900 @2x. Screenshots committed to `docs/screenshots/` against the e2e-rag-test project.
- README overhauled for v1.5-beta with Versions table pointing at both tags.

Outstanding (non-editorial WikiLM tickets): STO-1770 (cascade source removal on delete, Low) and STO-1767 (MCP v2 destructive ops, Low). Both purely additive / nice-to-have.

## Known Issues

- Wiki pages are filesystem-based (not DB-backed) — search is server-side file reads
- Research results from web search depend on the chosen provider's grounding quality — URLs are sometimes approximate
- `wiki_pages` DB table exists but is not synced with filesystem wiki — API reads from disk directly
- Synthesis pending flag is in-memory only — if server restarts during a synthesis burst, follow-up is lost (next ingest re-triggers; not a data-loss issue, just a staleness window)
- Research results don't stream as found — Claude's tool-use pattern emits all `RESULT:` lines in the final text phase (investigation ticket STO-1750 cancelled)
- Ollama streaming for research/chat still unsupported — `streamClaude` emits a type-specific error for `ollama:*` models (research: "no web grounding", chat: "streaming not wired"). UI blocks Ollama for research entirely via `NEEDS_WEB_GROUNDING` set in Settings.
- Local directory is still `~/SecondBrain/` and DB file is still `secondbrain.db` — deferred per user preference ("leave it as long as everything else is ok")
- Ingest prompt can reference entities without creating pages → dangling wikilinks (tightened in STO-1765 but not zero-risk — "wikilink discipline" rule is soft guidance, not enforced by code)
- MCP v1 omits destructive ops (move/delete/promote) — tracked as STO-1767
- Deleting a source leaves behind wiki pages it seeded (mentions, citations) — tracked as STO-1770
- Mobile UI not responsive — 3-pane layouts (wiki detail, chat) work but cramped on phone-width; no PWA manifest. Works fine on iPad.
- No auth anywhere — safe to expose via tunnel/LAN only if you add a reverse proxy with basic auth

## Known Gotchas

- **Nested-project subprocesses write to wrong wiki** → Claude walks up to repo-root `.claude/CLAUDE.md` which describes flat layout → fix: `createProjectDirectories` scaffolds a per-project `.claude/CLAUDE.md` (STO-1763). Backfill via `POST /api/admin/backfill-claude-md` if you find an old project without one.
- **Spawn cwd must be `projectRoot(project)`, not repo root** → Claude's relative path resolution picks up the wrong wiki → fix: every subprocess endpoint passes `projectRoot(project)` as the spawn cwd. Full list of endpoints now aligned: ingest-web, lint/run, lint/fix, lint/findings/[id]/fix, sources/research, sources/upload, sources/upload-md, sources/[id], claude/stream, claude/job, projects/[id]/synthesis/parent-run, lint/parent-run.
- **`upload-md` used to always ingest** → STO-1743's "save as pending" contract required `ingest=false` default → fix: endpoint now defaults to pending status, only spawns Claude if `ingest: true` in body.
- **`upload-md` raw file landed in top-level `raw/`** → even when projectId pointed to a nested project → fix: use `path.join(projectRoot(project), "raw")` instead of `path.join(process.cwd(), "..", "raw")`.
- **Next.js 16 prerender fails on `useSearchParams()` without Suspense** → 5+ minute debugging loop if you don't know → fix: wrap the hook-using component in `<Suspense fallback={null}>` at the page export level (see `/wiki` and `/sources` pages).
- **`persistLintFindings` clears existing findings for (projectId, scope) before inserting** → if a parent lint subprocess runs and produces 0 findings, seeded demo findings get wiped → fix: be aware, or add a "don't clear if incoming is empty" guard if it bites again.
- **Claude Code hook blocking subprocess writes on main** → a PreToolUse hook gated on `git branch` caught every subprocess Claude, not just interactive ones → fix: removed the hook (was in `~/.claude/settings.json`). If reinstated, scope it to code paths, exclude `wiki/` + `projects/*/wiki/`.
- **`claude -p` asks for write permissions** → spawned without `--allowedTools` → fix: pass `--allowedTools "Write" "Edit" "Read" "WebSearch" "WebFetch"` in spawn args
- **Hot-reload doesn't pick up claude-runner.ts changes** → module cached by Next.js → fix: restart dev server after changing claude-runner.ts
- **Jobs beyond MAX_CONCURRENT (3) silently failed** → `startJob` threw error caught by caller → fix: implemented job queue with auto-drain
- **Rapid ingest bursts would queue N synthesis jobs** → each onComplete fires trigger independently → fix: coalescing flags in claude-runner.ts (synthesisInFlight + synthesisPending) collapse to at most 2 runs per burst
- **Model setting value format** → bare aliases ("sonnet") = Claude; "ollama:<model>" prefix = Ollama HTTP; "gemini:<model>" prefix = Gemini CLI. `startJobProcess` + `streamClaude` both dispatch based on prefix.
- **Gemini model IDs must be preview endpoints** → `gemini-3-flash`/`gemini-3-pro` 404 against the live API → fix: use `gemini-3-flash-preview` and `gemini-3.1-pro-preview`
- **Gemini CLI needs `-y` (yolo) flag** → without it the CLI prompts for tool approval and hangs since we have no stdin → fix: always pass `-y -o text` in spawn args
- **streamClaude was hardcoded to claude** → picking Gemini for research did nothing silently → fix: `streamClaude` now branches on model prefix and emits structured errors when the stream provider isn't supported (Ollama)
- **Research results cleared on tab close** → sessionStorage is per-tab → fix: migrated `sb_research_query` + `sb_research_results` to localStorage
- **Backup only grabbed top-level wiki/** → `projects/<slug>/wiki/` was silently excluded → fix: tar now includes both `wiki/` and `projects/`; archive renamed `content-<ts>.tar.gz`
- **`gh repo rename` updates both GitHub and the local remote** → so after renaming you don't need a separate `git remote set-url`
- **Marp CLI hangs forever when spawned without stdin** → default behavior reads markdown from stdin, background hooks have no stdin → fix: always pass `--no-stdin` + a `timeout: 60_000` to `execFile` (see `outputs/generate/route.ts` deck branch).
- **Wikilinks render as raw `[[path/name]]` in Marp decks + docx** → Marp + the docx lib don't know about wiki syntax → fix: apply `humanizeWikilinks(markdown)` preprocessor on the copy handed to the exporter. Keep the authored `.md` intact so WikiLM's viewer keeps clickable links — only preprocess the derived artifact.
- **Output regenerations silently overwrote earlier artifacts** → baseSlug was date-only → fix: baseSlug now includes HHmm timestamp (`buildOutputBaseSlug` in `output-types.ts`).
- **Infographic `.html` invisible in wiki list / graph** → walker only picks up `.md` → fix: post-job hook writes a companion `.md` stub with `type: output` frontmatter that references both the `.html` and `.png` artifacts.
- **Source card subtitles leaked raw JSON** → code fell through to `s.meta` which is the JSON blob → fix: `humanizeSubtitle` helper prefers `author`, then parses `meta` JSON to surface `domain`/`summary`/type label.
- **Modal can't be dismissed while a long job runs** → fixed by removing `disabled={inFlight}` from X/outside-click handlers; added an "in-flight footer" with Cancel job + "Close — let it run" buttons. Job keeps running in the background.
- **Chat page used hardcoded `PROJECT_ID=1`** → sessions + saved queries all landed in top-level wiki regardless of active project → fix: `useProject()` everywhere + `?projectId=` filter on `GET /api/chat/sessions` (STO-1771).
- **Claude Code `claude -p` subprocess default tools allow limited FS writes** → the output-generation prompt wants to write HTML with `<script>` tags, which triggered "Write tool: blocked extension" in earlier versions → current setup already lists Write + Edit in `--allowedTools`, so fine today; flag if it regresses.
- **Cross-project API endpoints that should be project-scoped** → audit: any `GET /api/.../something` that reads `lintFindings`, `chatSessions`, `sources` etc. must take a `?projectId=` query param and filter. Reminder triggered twice this session: STO-1771 (chat sessions), STO-1772 (dashboard nudges). Default assumption for any new list endpoint: scope by active project, expose the unfiltered variant only if there's an explicit reason (e.g. cross-project search).
- **Hover preview card flew in from (-9999,-9999) on first hover** → CSS was transitioning both `opacity` AND `transform` over 180ms, combined with the rAF-positioned inline transform that starts off-screen → fix: transition `opacity` only; delete the idle `translateY(4px)` / show `transform: none` overrides so the inline transform is authoritative. See `globals.css` `.preview` rules.
- **Hover preview card positioned inside a `zoom: var(--fs-scale)` ancestor** → `position: fixed` inside a zoomed ancestor calculates from scaled coordinate space, offsetting the card from the real cursor → fix: render card via `createPortal(node, document.body)` so it escapes the `.content` zoom context; drive position via rAF-batched `style.transform` mutation on a ref so moves don't cause React renders.
- **Settings `model_<type>` keys must use underscore, not colon** → I wrote `model:<type>` earlier and `getModel` read `model_<type>` — dropdowns had no effect on the actual selection. Always use `model_` underscore form; audit DB for any stale `model:` rows.
- **Ollama job with bad model name returned a generic 404 stack** → now `ollama-runner` parses 404 body and sets `errorCode: model_not_found` with Ollama's own "model 'x' not found" message. Same applies to Gemini: `gemini-runner` classifies 404/429/auth stderr into `model_not_found` / `rate_limited` / `auth_failed`.
- **SSE consumers silently dropped `type:"error"` frames** → chat + research both only handled `type:"content"`. If a user picked Ollama for /chat or /research, the stream correctly emitted an error frame but the UI swallowed it → fix: both pages now check `evt.type === "error"` and toast the message.
- **README screenshots were never committed** → image links existed but `docs/screenshots/*.png` didn't → fix: `scripts/capture-screenshots.mjs` drives headless Chrome (piggy-backs on the `puppeteer-core` already vendored for infographic PNG rendering). Seeds `localStorage.activeProject` before navigation. Run from repo root with dev server on :3000.
- **Help modal (`?` key) had no visible affordance** → added a `?` icon button to the topbar next to the type-tweaks icon that dispatches the existing `editorial:open-help` window event.
- **Gemini CLI rate-limits on rapid Pro calls** → 429 Too Many Requests from cloudcode-pa.googleapis.com; recovers after ~20s. Classified as `rate_limited` with actionable message "switch to Flash (higher quota)".

## Last Session

```
**Date:** 2026-04-21 (multi-hour session — v1.5-beta cut + model eval + screenshots)
**Who:** Claude session
**What was done:**

v1.5-beta released on main. Summary of commits since prior handoff at 2687d13:

- 9ad14c7 fix(wiki): preview card — portal out of zoom, cursor-accurate, no flicker
- b603099 fix(wiki): preview card — kill first-hover flash from top-left
- 7d840aa fix(providers): graceful failure across Claude, Gemini, Ollama
- 274fb4b fix(gemini): classify 404 / 429 / auth errors into errorCode
- ade5365 fix(research): block Ollama — no web grounding
- 835a401 feat(outputs): inline infographic preview with click-to-open HTML
- 558a791 content: e2e-rag-test project + incremental output + log entries
- 4677548 merge: v1.5-beta — editorial-brutalist frontend + multi-provider routing
- 843cb61 docs: README overhaul for v1.5-beta
- 9b71703 docs: capture v1.5-beta screenshots via puppeteer-core
- 79d9f89 fix(topbar): visible help (?) button next to the tweaks icon

Major work:
1. Hover preview card fully rewritten — portal out of .content (which has `zoom: var(--fs-scale)`) to document.body, rAF-batched transform mutation on a ref (React state only {visible, data}), CSS transitions limited to opacity. Killed flicker, tracking drift, and first-hover flash.
2. E2E eval on the e2e-rag-test project (29 pages of real RAG surveys) — graph health, orphan check, cross-source tension coverage all clean.
3. Full provider ping matrix: Claude (sonnet/opus/haiku + explicit IDs), Gemini (3-flash-preview, 3-pro-preview, 3.1-pro-preview) — bare `-flash`/`-pro` return 404 as expected, Ollama (qwen2.5-coder, gemma4:e4b). All green.
4. Surfaced + fixed 4 graceful-failure gaps: (a) chat+research SSE consumers silently dropped `type:"error"` frames; (b) Ollama jobs with bad model names returned raw 404 stacks; (c) /jobs+/compose showed raw `[code] msg` brackets instead of `formatJobError` titles; (d) Gemini stderr stack traces (429, 404, auth) weren't classified. All fixed with structured errorCodes + friendly messages.
5. Research grounding guard: UI disables Ollama options in Settings for research (tooltip + optgroup label); streamClaude error frame on research is now type-specific ("needs live web access").
6. Infographic output pages now show the PNG inline (click to open HTML); ext pills force download via `&download=1`.
7. Version cut: tagged current main as `v1-alpha` (preserves pre-editorial release), fast-forward merged feat/editorial-frontend into main with a summary merge commit, tagged HEAD as `v1.5-beta`. Both tags pushed.
8. README rewritten top-to-bottom for v1.5-beta with Versions table.
9. Screenshots: built scripts/capture-screenshots.mjs — puppeteer-core driven rig (piggybacks on the Chrome discovery + puppeteer-core we vendored for infographic PNG rendering). Seeds `localStorage.activeProject` then navigates each route at 1440×900 @2x. Captured 13 screenshots against e2e-rag-test and committed them to docs/screenshots/. README image references updated.
10. User-visible `?` help button added to the topbar (circle-with-?-glyph) next to the type-tweaks icon. Dispatches the existing editorial:open-help event.

**What's next:**
- STO-1770: Cascade source removal — delete source + sweep wiki pages it seeded. Still Low, still deferred.
- STO-1767: MCP v2 destructive ops (move/delete/promote preview-confirm pairs). Low. Easy to land when wanted.
- Optional: mobile-responsive UI polish. Editorial UI hasn't been mobile-tuned yet.
- Optional: expose via LAN or cloudflared tunnel for remote/mobile access (still no auth — don't expose broadly without basic auth).
- Optional: evaluate adding Ollama SSE streaming support so chat+research aren't hard-blocked. Research grounding would still be absent, but chat could work.
- Consider filing tickets for v1.5-beta follow-up: (a) the `model:chat` stale DB row from earlier underscore/colon bug — low-priority cleanup; (b) v2 of screenshot rig to also capture the Tweaks panel and the Running Jobs panel.

**Branch:** main (clean, pushed to origin at 79d9f89; tags `v1-alpha` and `v1.5-beta` both on origin).
**Blockers:** None.
```

## Prior Session (2026-04-19 — output generation + note capture)

Four tickets shipped + one bug filed/fixed in a long session:

STO-1766 — NotebookLM-style output generation (High, Done)
- Five artifact types all running through the job queue with model provenance:
  - Report → .md + .docx
  - Executive summary → .md + .docx
  - Cheat sheet → .md + .docx
  - Briefing deck → .md + .pdf + .pptx (Marp CLI)
  - Infographic → .html + .png (headless Chrome)
- New endpoints (with path-traversal guards): generate, download, delete
- Central output-types registry (src/lib/output-types.ts) — id, label, prompt builder, primary/companion extensions
- Post-job hooks: docx via export-docx, decks via Marp CLI (--no-stdin + timeout), infographic PNG via puppeteer-core + system Chrome discovery. humanizeWikilinks preprocessor for exports.
- baseSlug now includes HHmm timestamp → regenerations don't silently overwrite.
- Generate Output modal with scope (project / whole subtree) + focus nudge. Dismissible mid-generation (job stays running).
- Outputs appear in /wiki with a new pink Sparkles-icon "output" type. Per-row trash delete.
- Sidebar footer active-job now clickable → slide-up Running Jobs panel with per-row cancel. Model badge shown everywhere (sidebar, panel, /jobs, output frontmatter).
- MCP server gained generate_output as its 9th tool.

STO-1768 — Add-note UI on /sources (Medium, Done)
- NoteComposerModal component: title, tags (chip input), markdown body, project picker (useProject default), Pending/Ingest-now segmented control. Validates title + body ≥ 10 chars. Blocks dismiss during submit.
- "New note" button wired in /sources top-right action row. Posts to existing /api/sources/upload-md.

STO-1769 — Chat-to-note (Medium, Done)
- Added "note-summary" to JobOptions.type union + ENV_MODELS + typeIcons on /jobs + running-jobs-panel.
- New POST /api/chat/save-as-note — builds summariser prompt (Overview / Key points / Open questions + YAML frontmatter) and spawns note-summary job. onComplete reads the file, parses frontmatter, inserts source row as pending.
- "Save thread as note" button in /chat header, disabled until ≥ 2 messages.
- UAT passed: ~22s run on sonnet produced clean, well-structured MoE-vs-dense note.

STO-1771 — Fix hardcoded PROJECT_ID=1 on /chat (Medium, Done — filed this session)
- Surfaced during STO-1769 work. /chat was writing all sessions + saved queries to project 1 regardless of active project.
- useProject() throughout. GET /api/chat/sessions accepts ?projectId= filter. Session sidebar re-fetches on project switch and clears the active thread.
- Replaced two native alert() calls in saveToWiki with toasts.

Peripheral polish this session:
- Sources page: humanizeSubtitle helper — no more raw JSON bleeding into source cards.
- In-app Help modal added (sidebar footer + ? keyboard shortcut). Explains the idea, the flow, each page, output generation, nested projects, and credits Karpathy.
- Root README.md written (was missing) — positioning, 8 screenshots (wiki concept detail, synthesis page, generate modal, help modal, jobs, sources, lint, nudges), setup pointers, Karpathy gist attribution.
- Fixed source cards leaking JSON subtitles.

STO-1772 — Dashboard Nudges not scoped to active project (Medium, Done — filed + fixed this session)
- Surfaced by user at end of session. `/api/dashboard/nudges` was returning all parent-scoped findings unfiltered; `NudgesSection` didn't pass a projectId.
- Endpoint now accepts `?projectId=` and filters; NudgesSection uses `useProject()` and re-fetches on switch. Hidden/busy state resets across switches so optimistic dismissals don't leak.
- Same class of bug as STO-1771.

STO-1773 — /lint + /sources ingest not scoped to active project (Medium, Done — filed + fixed this session)
- Third instance of the same class of bug in one session.
- /lint: 4 call sites (fetchFindings, runLint, fixOne, fixMany) all used hardcoded `projectId: 1`. Now use `activeProject.id` from `useProject()`. fetchFindings defers until project is hydrated; selected-ids reset on project switch.
- /sources: 3 call sites (addUrl quick-URL ingest, setResultStatus research-approve ingest, uploadFiles multipart upload) had hardcoded `projectId: 1` or omitted it entirely. All now use `activeProject?.id ?? 1`.
- Added "audit project-scoping on list endpoints" gotcha to prevent recurrence.

Commits (all on main, pushed):
- 7744bad feat(STO-1766): NotebookLM-style output generation + in-app help
- bd69947 docs: expand README with lint, nudges, and synthesis/concept screenshots
- 9427b16 feat: in-UI note capture (STO-1768, STO-1769, STO-1771)
- 8efd727 fix(STO-1772): scope Dashboard Nudges to active project
- 4db4d43 fix(STO-1773): scope /lint + /sources ingest to active project
- a642b65 fix(STO-1773): scope sidebar + running-jobs-panel to active project (sweep)

**What's next:**
- STO-1770: Cascade source removal — delete source + sweep wiki pages it seeded. Bigger scope (touches wiki rewrites), Low priority. Needs design thinking about what "sweep" actually means — find + confirm each affected page, or spawn a rewrite subprocess?
- STO-1767: MCP v2 destructive ops (move/delete/promote preview-confirm pairs). Low. Easy to land when wanted.
- Optional: mobile-responsive UI polish. WikiLM has no mobile tuning today — the 3-pane wiki detail and chat header are cramped on phone-width. Usable on iPad.
- Optional: expose via LAN or cloudflared tunnel for remote/mobile access (no auth today — don't expose broadly without basic auth).
- Optional: start dogfooding output generation more — the ai/llms example artifacts are good, but we haven't produced any for coding/wikilm yet.

**Branch:** main (clean, pushed to origin at bebc00c — see full commit list above).
**Blockers:** None.
```

## Prior Session (2026-04-18 → 2026-04-19)

Prior multi-day session shipped parent/child nesting + MCP v1:

STO-1758 — WikiLM parent/child project nesting (Done)
- 8 vertical slices: foundation → nav → cross-project links → move → children section → graph scope → parent synthesis/lint → dashboard nudges
- Materialized-path slugs (e.g. `coding/codeview`), filesystem mirrors slug
- New src/lib/projects.ts service; tree sidebar with collapse/persist; breadcrumbs on 5 pages
- Cross-project wikilinks `[[other-project/page]]` resolve; backlinks walk all projects
- Move project action with filesystem rename + wikilink rewrite + cycle/collision guards
- Parent synthesis + parent lint (promotion_candidate / recurring_theme / parent_gap finding types); lint_findings.scope column; Settings auto-sync toggle
- Dashboard Nudges section with Promote / Create concept / Research / Dismiss actions; sidebar pending-nudge badges

STO-1758 UAT follow-ups (Done)
- STO-1759: Suspense wrappers on /wiki and /sources so npm run build passes
- STO-1760: /sources and /jobs scoped to active project via ?projectId=
- STO-1761: distinct color palette for graph subtree mode
- STO-1762: "Add child…" shortcut in ProjectSwitcher ⋯ menu
- STO-1763: Per-project .claude/CLAUDE.md scaffold — cured the "subprocesses write to top-level wiki" bug. Backfill endpoint at /api/admin/backfill-claude-md.

STO-1743 — WikiLM MCP server v1 (Done)
- New mcp/ package at repo root: Node + TypeScript + @modelcontextprotocol/sdk
- 8 tools: list_projects, create_project, search_wiki, read_wiki_page, list_wiki_pages, get_project_synthesis, save_learning, get_job_status
- All tested end-to-end via JSON-RPC: nesting works, pending-by-default save works, CWD → slug resolution via ~/.wikilm/project-map.json works
- Registered globally in Claude Code: `claude mcp add --scope user wikilm node <repo>/mcp/dist/index.js`. Shows as ✓ Connected in `claude mcp list`.
- Project map pre-populated with <user-home>/codeview → coding/codeview and <user-home>/SecondBrain → ai/llms

STO-1764 — DRY cleanup (Done)
- Hoisted getAllMdFiles + parseFrontmatter to src/lib/wiki-utils.ts. −60 lines, fixed a drifted tags-parse bug in the graph route.

STO-1765 — Wiki quality (Done)
- Ingest prompt enforces wikilink discipline (every [[x]] must resolve) + lists existing parent/sibling entity pages to prefer cross-project links over duplicates.

Plus 8 audit-discovered projectCwd fixes across lint/fix, upload, research, claude/stream, claude/job, sources/[id] endpoints — every Claude subprocess now spawns in the right project dir.

Wiki content produced + committed this session:
- AI (id=9) + AI/LLMs (id=10) projects with real research-sourced pages (~60 wiki .md files)
- Coding (id=4) + Coding/Codeview (id=5) scaffolds

Tickets filed but not touched:
- STO-1766: Output generation — reports/slides/infographics (NotebookLM-style). High priority. Next session's big item.
- STO-1767: MCP v2 destructive ops (move/delete/promote preview-confirm pairs). Low.

**What's next:**
- STO-1766 output generation is the top new item. Fresh session recommended — design a "Generate output" panel with 5 types (report/deck/infographic/cheat/summary), scope toggle, nudge input, endpoint wiring + prompt templates per type.
- Verify MCP from a fresh Claude Code session: restart, open any dev project, try `list_projects` + `save_learning`.
- Optional polish: STO-1767 MCP destructive ops if needed, STO-1765 v2 (auto-create-page for every wikilinked entity).

**Branch:** main (clean, pushed to origin at 2b77ad1 before CLAUDE.md update).
**Blockers:** None.
```
