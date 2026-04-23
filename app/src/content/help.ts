// Single source of truth for user-facing help.
// Consumed by /help page, the in-app help modal, and the chat prompt digest.
// Keep each body short (target ≤ 200 words). Plain markdown — no frontmatter.

export interface HelpTopic {
  slug: string;
  title: string;
  section: HelpSection;
  summary: string;
  body: string;
}

export type HelpSection =
  | "Getting started"
  | "Concepts"
  | "Workflows"
  | "Providers"
  | "MCP"
  | "Navigation"
  | "Troubleshooting";

export const HELP_SECTIONS: HelpSection[] = [
  "Getting started",
  "Concepts",
  "Workflows",
  "Providers",
  "MCP",
  "Navigation",
  "Troubleshooting",
];

export const helpTopics: HelpTopic[] = [
  // ── Getting started ─────────────────────────────────────────────────
  {
    slug: "what-is-wikilm",
    title: "What WikiLM is",
    section: "Getting started",
    summary:
      "Local-first personal knowledge base where an LLM does the maintenance — you drop sources, it writes structured interlinked wiki pages.",
    body: `WikiLM is a local-first knowledge base built around the pattern Andrej Karpathy described in his *LLM wiki* gist: raw sources go in, structured interlinked markdown comes out.

You drop material into **Intake** (a PDF, a URL, a note you typed). The model reads it, writes a source summary, extracts the entities and concepts it mentions into their own pages, links everything with \`[[wikilinks]]\`, and keeps a running project overview. A single source typically touches 5–15 wiki pages. Updates to existing pages happen in place — knowledge compounds.

Everything stays on your machine as plain markdown files. There's no vector store, no embeddings, no cloud database. The graph you build is readable by any other markdown tool (Obsidian will open it directly).

You work with the wiki through the web UI, through chat, by generating polished outputs (reports, decks, infographics, cheat sheets), or by asking another Claude Code session to read/write via the MCP server.`,
  },
  {
    slug: "first-source",
    title: "Add your first source",
    section: "Getting started",
    summary:
      "Go to Intake, drop a file / paste a URL / type a note, approve it, watch the wiki fill in.",
    body: `Head to **Intake** (⌘3). You've got four intake paths:

1. **Drop a file** — PDF, HTML, markdown, or plain text. Drag onto the drop zone or use the picker.
2. **Paste a URL** — the quick-URL field at the top. The fetched page is the raw source.
3. **Type a note** — *New note* button. Open the composer, write markdown, save as pending or ingest immediately.
4. **Commission research** — the research panel lets the grounded provider (Claude, with web search) pull fresh sources to your project.

New sources land as **pending** by default — raw captured, no wiki pages yet. Click **Approve** to trigger ingest. Ingested sources produce 5–15 wiki pages on the first run.

The Ledger dashboard updates live. Once you have a handful of pages, open **Wiki** (⌘2) and click around — every \`[[wikilink]]\` shows a hover preview; every page has backlinks. The **Map** (⌘7) is the force-directed view of the whole graph.`,
  },
  {
    slug: "the-graph",
    title: "How the graph forms",
    section: "Getting started",
    summary:
      "Ingest writes a source page, then creates/updates entity + concept pages; wikilinks between them form the graph automatically.",
    body: `Ingestion is opinionated about structure. For each raw source, the model writes:

- One **source summary** (\`wiki/sources/<slug>.md\`) — key takeaways, claims, quotes.
- Zero or more **entity pages** (\`wiki/entities/…\`) — people, organisations, products, projects named in the source.
- Zero or more **concept pages** (\`wiki/concepts/…\`) — ideas, methods, frameworks the source uses.

All three types link to each other with \`[[wikilinks]]\`. Existing pages referenced by the new source get updated in place (new mentions, new quotes, new cross-references). Duplicate detection is prompt-level, not schema-level — if the wiki already has \`anthropic.md\` and a new source mentions Anthropic, the existing page gets updated rather than a new \`anthropic-2.md\` being created.

The result: every source you add thickens the graph. Nodes gain incoming links; new connections surface contradictions between sources or thematic clusters you didn't plan for. The **Map** page visualises this directly.`,
  },

  // ── Concepts ────────────────────────────────────────────────────────
  {
    slug: "page-types",
    title: "Page types",
    section: "Concepts",
    summary:
      "Source / entity / concept / comparison / synthesis / query / output — each with its own folder and frontmatter.",
    body: `Every wiki page is a markdown file with YAML frontmatter. The \`type:\` field determines the page's role:

- **source** — a captured external piece of material (\`wiki/sources/\`)
- **entity** — a named thing: person, org, product, project (\`wiki/entities/\`)
- **concept** — an idea, method, theory, framework (\`wiki/concepts/\`)
- **comparison** — side-by-side analysis of competing items (\`wiki/comparisons/\`)
- **synthesis** — thematic overview tying multiple sources together (\`wiki/synthesis/\`)
- **query** — a preserved answer to a question you asked (\`wiki/queries/\`)
- **output** — a generated artifact: report, deck, cheat sheet, infographic (\`wiki/outputs/\`)

All page types can link freely to all other types. The type determines colour on the Map and iconography in the wiki picker; the underlying file is just markdown. You can edit any page by hand; the LLM will respect your edits on the next ingest.`,
  },
  {
    slug: "wikilinks-and-backlinks",
    title: "Wikilinks, backlinks, and the graph",
    section: "Concepts",
    summary:
      "`[[wikilinks]]` are the edges. Every page's backlinks section is the inbound view. Cross-project links use `[[project-slug/page-name]]`.",
    body: `Links between pages use the Obsidian-compatible \`[[page-name]]\` syntax. Resolution is by page name across the current project's wiki.

The page reader renders every wikilink as a clickable hover-previewed entry. The hover card (portal-rendered, tracks the cursor) shows the linked page's opening paragraph without leaving the current page.

Every page also has a **backlinks** section automatically derived from a reverse scan — which other pages link here. This is the structural spine of the graph: a well-connected page has many inbound backlinks.

Cross-project wikilinks use \`[[project-slug/page-name]]\` syntax. They resolve as long as both projects exist. The Map shows cross-project edges when the graph scope is set to the parent.

Dangling wikilinks (a \`[[foo]]\` where no \`foo.md\` exists) surface in the **Lint** page under "wikilink-discipline" findings.`,
  },
  {
    slug: "projects-and-nesting",
    title: "Projects and nesting",
    section: "Concepts",
    summary:
      "Each project is an isolated wiki under `projects/<slug>/`. Projects nest: parent synthesis rolls up from children.",
    body: `A project is an isolated wiki with its own \`raw/\` and \`wiki/\` directories. Projects can nest arbitrarily — e.g. \`ai\` has \`ai/llms\` as a child, which has its own sources and concept pages.

The **default project** (id=1) lives at the repo root (\`wiki/\` and \`raw/\` top-level). Everything else lives under \`projects/<slug>/\` — slugs follow the nesting (\`ai/llms/\`).

Each project gets its own synthesis overview. When child projects exist, the parent's synthesis rolls up from the children's overviews (summary-of-summaries, not a re-read of all child content).

Use the sidebar ⋯ menu on any project node to **Add child**, **Move** to a new parent, or **Delete**. Moving rewrites cross-project wikilinks to reflect the new path.

Switching active projects scopes everything — Intake uploads, Chat threads, Lint findings, Nudges, and the Map all follow the active project automatically.`,
  },
  {
    slug: "synthesis",
    title: "Synthesis",
    section: "Concepts",
    summary:
      "One overview page per project. Coalesced — one synthesis runs after a burst of ingests, never mid-batch.",
    body: `Synthesis is the project-wide overview: one page at \`wiki/synthesis/project-overview.md\` that summarises main topics, key entities, major concepts, known contradictions, and gaps across the current wiki state. Max 500 words. Every mention links to its page with \`[[wikilinks]]\`.

It runs automatically after ingests, research approvals, and lint fixes complete — but **only when the job queue is fully idle**. A burst of ten uploads produces exactly one synthesis at the end, not ten stale snapshots mid-batch.

Synthesis does NOT touch individual concept or entity pages — those are updated during ingestion itself. Think of it as: ingestion = fine-grained page work, synthesis = big-picture overview only.

If the project has a parent and the *Auto-sync parent synthesis* setting is on, each child synthesis completion also triggers a (coalesced) parent synthesis update.`,
  },
  {
    slug: "lint",
    title: "Lint",
    section: "Concepts",
    summary:
      "Health-check the wiki: orphans, dangling wikilinks, stale claims, contradictions, missing cross-refs. Fix queues a repair.",
    body: `The **Lint** page surfaces structural issues the LLM can spot by reading the wiki back:

- **Orphan pages** — no inbound wikilinks from anywhere else.
- **Dangling wikilinks** — a \`[[foo]]\` where no page named foo exists.
- **Missing cross-references** — pages that mention each other in prose but don't link.
- **Contradictions** — two sources stating incompatible facts about the same entity.
- **Stale claims** — an older source's assertion superseded by a newer one.
- **Recurring themes** (parent scope) — a concept multiple children reference that could be promoted to the parent.
- **Promotion candidates** (parent scope) — a child-project page that belongs in the parent.
- **Parent gaps** (parent scope) — concepts the parent should cover but doesn't.

Each finding has **Fix** (queues a repair job) and **Dismiss** (hides permanently). Run lint manually or let it run after parent-synthesis updates. Dismissed findings stay dismissed across lint passes.`,
  },
  {
    slug: "outputs",
    title: "Outputs",
    section: "Concepts",
    summary:
      "Generate report / summary / cheat sheet / deck / infographic from wiki content. NotebookLM-style, but rooted in your graph.",
    body: `From the wiki reader, click **✦ Generate output** to produce a polished artifact. Five output types:

| Type | Primary | Companion |
|---|---|---|
| Report | \`.md\` | \`.docx\` |
| Executive summary | \`.md\` | \`.docx\` |
| Cheat sheet | \`.md\` | \`.docx\` |
| Deck | \`.md\` | \`.pdf\` + \`.pptx\` (Marp-rendered) |
| Infographic | \`.html\` | \`.png\` (headless Chrome render) |

You choose **scope** (current page, current project, or whole subtree) and can add a **focus nudge** ("aim at a technical audience", "lead with the commercial framing", etc.).

Outputs land as \`output\`-type wiki pages in \`wiki/outputs/\`. They appear in the wiki list with a pink Sparkles icon. Infographics render their PNG inline on the wiki page; click the image to open the interactive HTML. File pills force download.

Every output is timestamped — regenerations don't overwrite earlier runs.`,
  },
  {
    slug: "nudges",
    title: "Dashboard nudges",
    section: "Concepts",
    summary:
      "Parent-level findings surfaced on the Ledger: promote a page up, create a concept, commission research, or dismiss.",
    body: `When a parent project has children, a periodic parent lint surfaces cross-project findings that a single-project lint can't see:

- **Promotion candidates** — a child page that's really a parent-level concept.
- **Recurring themes** — a concept mentioned in multiple children, not yet a parent page.
- **Parent gaps** — a concept the parent's existing pages reference but don't explain.

These appear on the **Ledger** (dashboard) as a *Nudges* block with four actions per finding:

- **Promote** — copy the child page up to the parent (keeps the child as-is).
- **Create concept** — spawn a new parent-level concept page for the recurring theme.
- **Research** — commission a grounded-provider research job to fill the gap.
- **Dismiss** — hide this finding for good.

Nudges are always scoped to the active project. Switching projects refetches.`,
  },
  {
    slug: "chat-vs-query",
    title: "Chat vs Query pages",
    section: "Concepts",
    summary:
      "Chat is ephemeral conversation. Query pages are preserved answers to questions worth keeping.",
    body: `The **Salon** (⌘4) is a multi-turn chat over your wiki. Threads persist per project. Context window is 12 turns — long threads silently drop their earliest messages from the prompt window (DB still holds the full history).

A chat turn is ephemeral — it doesn't land in the wiki automatically. Two escape hatches:

- **Save thread as note** — in the chat header, once you have ≥2 messages. Summarises the thread into a Note (pending by default, approve from Intake to ingest).
- **Save as query** — for single answers that are worth keeping long-term, save as a \`query\`-type wiki page (\`wiki/queries/\`). These become part of the graph and get backlinks like any other page.

Chat has access to the wiki, the synthesis, and the user's help knowledge bank (this document). If you ask "how do I add a source", chat can answer from the help content directly.`,
  },

  // ── Workflows ───────────────────────────────────────────────────────
  {
    slug: "add-a-note",
    title: "Add a note",
    section: "Workflows",
    summary:
      "On Intake, click New note. Title + tags + markdown body. Save as pending, or ingest now.",
    body: `Two ways to add a hand-written note:

**From Intake.** Click **New note** (top-right). The composer modal opens:
- Title (required)
- Tags (chip input)
- Body (markdown)
- Pending / Ingest now toggle (defaults to pending)

**From Chat.** After a thread has ≥2 messages, *Save thread as note* in the chat header runs a summariser and drops a structured pending note into Intake.

Pending notes wait for you to **Approve** them from the Intake list. Approval triggers ingestion, which produces the usual source summary + entity/concept updates. After ingest completes, the project synthesis refreshes (coalesced — no mid-batch runs).

Retry a failed ingest from the Intake row's *Retry* button. Same endpoint as Approve — the note goes back to \`ingesting\` and runs fresh.`,
  },
  {
    slug: "upload-file",
    title: "Upload a file",
    section: "Workflows",
    summary:
      "Drop PDFs / HTML / markdown / text on the Intake drop zone. File lives at projects/<slug>/raw/.",
    body: `Drag a file onto the **Intake** drop zone, or use the upload picker. Supported types: PDF, HTML/HTM, markdown (\`.md\`), plain text.

The raw file lands at \`<project-root>/raw/<safe-filename>\`. The source row is inserted in the DB as pending. Approve to ingest.

Markdown files with YAML frontmatter preserve their title from the \`title:\` field; otherwise the filename (sanitised) becomes the title.

If upload fails with "Failed" status, use the **Retry** button on the Intake row. Common causes: rate limit on the ingest model, auth failure, or a prompt-level issue that the model explains in \`jobs.error\`. The Dispatch page (⌘6) shows the job's error detail.`,
  },
  {
    slug: "paste-url",
    title: "Paste a URL",
    section: "Workflows",
    summary:
      "Quick-URL field at the top of Intake. Fetches the page, stores as a web source, ingests.",
    body: `The quick-URL field at the top of **Intake** accepts any \`http(s)://\` URL. Submit, the backend fetches the page, creates a \`web\`-type source row pointing at the URL, writes the fetched HTML into the project's \`raw/\` directory, and kicks off ingest.

The ingest step pulls out the article content, writes the source summary, and extracts entities/concepts the same way PDF ingestion does.

If the page is paywalled or JS-rendered, the fetcher may return truncated content. In that case, you'll get an ingested source with light coverage — consider instead typing a note with the key points, or saving the page as a \`.md\` and uploading that.`,
  },
  {
    slug: "commission-research",
    title: "Commission research",
    section: "Workflows",
    summary:
      "Ask the grounded provider to pull fresh sources on a topic. Approve results to ingest them.",
    body: `The **research** panel on Intake commissions the grounded provider (currently only Claude — Gemini and Ollama are blocked because they don't reliably web-search in headless mode) to find fresh sources on a topic you specify.

Enter a query. The model returns a list of candidate sources (title, URL, summary). Review and **Approve** the ones worth ingesting — approved results are added as web sources and the usual ingestion flow runs.

Research is grounded-only because ungrounded models hallucinate URLs (bare domains, no paths, pages that don't exist). Only providers that actually call their search tool are trusted here.

Long research sessions can produce dozens of candidates; only approve what's clearly relevant. Dismiss the rest — they don't clutter Intake.`,
  },
  {
    slug: "approve-pending",
    title: "Approve a pending source",
    section: "Workflows",
    summary:
      "On Intake, click Approve on any pending row. Triggers ingestion, refreshes synthesis.",
    body: `Pending sources show up on **Intake** with a *pending* pill and an **Approve** button.

Click **Approve** — the row moves to *ingesting* while the model reads the raw content, writes the source summary, and creates/updates entity + concept pages. Progress is visible in **Dispatch** (⌘6) and in the sidebar's active-job indicator.

When ingestion finishes successfully:
- Source row moves to *ingested*.
- Wiki page count ticks up.
- Project synthesis is flagged for refresh (fires when the queue idles).

If you approve several pending sources in a row, synthesis coalesces — one run at the end, not N runs mid-batch. This is a deliberate efficiency thing; don't worry about batching manually.`,
  },
  {
    slug: "save-chat-as-note",
    title: "Save a chat thread as a note",
    section: "Workflows",
    summary:
      "In the chat header, Save thread as note. Summariser runs, drops a structured pending note on Intake.",
    body: `Once a chat thread has ≥2 messages, the **Save thread as note** button in the chat header becomes active.

Clicking it spawns a summariser job that:
1. Reads the transcript from DB.
2. Produces a structured markdown note: *Overview*, *Key points*, *Open questions*, plus YAML frontmatter with tags.
3. Drops it into the project's \`raw/\` dir and inserts a pending source row on Intake.

Default status is *pending* — the thread doesn't auto-ingest. Review the summariser's output from Intake, approve to ingest into the wiki, or edit first (the raw file is a plain \`.md\` you can open in any editor).

Summariser uses the \`note-summary\` model setting in Press → Models (Claude sonnet by default).`,
  },
  {
    slug: "generate-output",
    title: "Generate an output",
    section: "Workflows",
    summary:
      "From wiki reader, ✦ Generate output — pick type, scope, focus nudge. Report / summary / cheat sheet / deck / infographic.",
    body: `From any wiki page, click **✦ Generate output** (or use ⌘8 for the Dictation view).

Pick a type (report / summary / cheat sheet / deck / infographic), a scope (current page / current project / whole subtree), and optionally a *focus nudge* ("write for a technical audience", "lead with the commercial framing", "prioritise the 2024–2026 shift").

Submit. The job spawns in the queue. You can dismiss the modal mid-generation — the job keeps running in the background; progress is visible in **Dispatch** (⌘6) and the sidebar job beacon.

When complete, the output lands in \`wiki/outputs/\` as an \`output\`-type page, with companion artifacts alongside (docx for reports, pdf+pptx for decks, png for infographics). The Wiki list shows it with a pink Sparkles icon. Infographics render their PNG inline.

Regenerations don't overwrite — each run gets its own timestamp.`,
  },
  {
    slug: "run-lint",
    title: "Run Lint",
    section: "Workflows",
    summary:
      "The Edit (⌘5) health-checks the wiki. Findings grouped by category. Fix or Dismiss each.",
    body: `**The Edit** (⌘5) is the Lint page. Click **Run lint** to spawn a fresh lint job; results populate the findings list within a minute or two.

Findings are grouped by category (orphan, dangling-wikilink, missing-crossref, contradiction, stale-claim, wikilink-discipline, etc.). Each has:

- **Fix** — queues a repair job that rewrites the affected pages.
- **Dismiss** — hides this finding permanently across future lint runs.

For parent projects, parent-scope lint surfaces additional categories (promotion candidates, recurring themes, parent gaps) — these appear as Nudges on the Ledger instead.

Lint is safe to run mid-session; it doesn't touch the queue's active jobs. Fixes run through the same job queue everything else uses.`,
  },

  // ── Providers ───────────────────────────────────────────────────────
  {
    slug: "choosing-a-provider",
    title: "Choosing a provider",
    section: "Providers",
    summary:
      "Per-job-type selection in Press. Claude = default + only trusted research provider. Gemini = fast/cheap for ingestion. Ollama = local-only, research disabled.",
    body: `WikiLM routes jobs to three providers based on a per-job-type setting (Press → Models):

- **Claude** — \`sonnet\`, \`opus\`, \`haiku\` aliases plus explicit IDs. Best for research (only trusted provider here), quality ingestion, and chat where citation accuracy matters.
- **Gemini** — \`gemini-3-flash-preview\`, \`gemini-3.1-pro-preview\` via the \`gemini\` CLI. Fast and cheap for bulk ingestion. *Blocked for research* — grounding in headless mode is unreliable.
- **Ollama** — any locally-installed model via local HTTP. Fully offline. *Blocked for research* — no web grounding.

Press shows live availability pings per provider and disables the ones currently failing. Jobs that hit an unavailable provider produce structured errors (\`provider_unavailable\`, \`model_not_found\`, \`rate_limited\`, \`auth_failed\`) with actionable messages.

Mix providers per job type — e.g. Gemini flash for ingest, Claude for synthesis, Ollama for chat.`,
  },
  {
    slug: "why-research-is-grounded-only",
    title: "Why research is grounded-only",
    section: "Providers",
    summary:
      "Ungrounded models hallucinate URLs. Only providers that actually call their web-search tool in headless mode are trusted for research.",
    body: `Research commissions a model to *find* new sources on a topic. This requires a real web-search tool call — not parametric knowledge.

**Claude** with web search enabled does this reliably in headless \`claude -p\` mode. **Gemini CLI** exposes \`google_web_search\` but does not reliably call it in headless \`-p -y\` mode; it answers from parametric knowledge and produces bare-domain URLs that don't actually exist. **Ollama** has no built-in web search at all.

Letting an ungrounded model "research" returns plausible-looking hallucinated links. Users approve them, the fetcher returns 404s, nothing useful lands in the wiki — or worse, fake citations pollute the graph.

Research is therefore hard-blocked on Ollama and Gemini in the Press panel. If you want Gemini back for research, it needs stream-json tool-use verification or a move off the CLI to the Gemini SDK's \`googleSearch\` grounding config. Tracked as a follow-up in the session handoff.`,
  },

  // ── MCP ─────────────────────────────────────────────────────────────
  {
    slug: "mcp-overview",
    title: "What the MCP server does",
    section: "MCP",
    summary:
      "Claude Code sessions in other projects can read from + write to your wiki without touching the UI.",
    body: `The MCP (Model Context Protocol) server exposes WikiLM as a tool-providing service that any Claude Code session can connect to — globally, once set up.

Example: you're coding in \`~/codeview\`, you realise the async-queue pattern you just solved is worth capturing. Tell Claude Code in that session *"save this as a learning to my wiki"* — it calls \`save_learning\` via the MCP, a pending note lands on Intake, you approve it next time you're in WikiLM.

Or: *"what patterns do I have for cascading deletes?"* — Claude Code calls \`search_wiki\`, reads the relevant pages, answers with citations back to your wiki.

Nine tools: \`list_projects\`, \`create_project\`, \`search_wiki\`, \`read_wiki_page\`, \`list_wiki_pages\`, \`get_project_synthesis\`, \`save_learning\`, \`get_job_status\`, \`generate_output\`. Read tools are always safe; write tools default to pending so nothing lands in the graph without explicit approval.`,
  },
  {
    slug: "mcp-setup",
    title: "Set up the MCP server",
    section: "MCP",
    summary:
      "Build the mcp/ package, register with `claude mcp add --scope user`, optionally seed the project map.",
    body: `The MCP server lives in the \`mcp/\` package. One-time setup:

\`\`\`bash
cd mcp
npm install
npm run build
\`\`\`

Register globally with Claude Code:

\`\`\`bash
claude mcp add --scope user wikilm node <repo>/mcp/dist/index.js
\`\`\`

Verify connection — \`claude mcp list\` should show wikilm as ✓ Connected.

To map dev directories to wiki projects automatically (so "save a learning" from \`~/codeview\` lands in the \`coding/codeview\` wiki), seed \`~/.wikilm/project-map.json\`:

\`\`\`json
{
  "/Users/you/codeview": "coding/codeview",
  "/Users/you/another-project": "another-project"
}
\`\`\`

Unmapped cwds default to creating/using a project named after the directory basename.`,
  },

  // ── Navigation ──────────────────────────────────────────────────────
  {
    slug: "pages-overview",
    title: "Pages overview",
    section: "Navigation",
    summary:
      "Ledger, Wiki, Intake, Salon, The Edit, Dispatch, Map, Dictation, Press. ⌘1–⌘9.",
    body: `Nine top-level pages, numbered left to right in the sidebar:

- **01 · Ledger** (⌘1) — dashboard. Stat run, recent pages, nudges, dispatch snapshot.
- **02 · Wiki** (⌘2) — article reader. Picker with collapsible type groups, hover-previewed wikilinks, margin cards.
- **03 · Intake** (⌘3) — sources. Drop files, paste URLs, write notes, commission research, approve pending.
- **04 · Salon** (⌘4) — chat over the wiki. Multi-turn, saveable as notes.
- **05 · The Edit** (⌘5) — lint. Findings grouped by category with Fix / Dismiss actions.
- **06 · Dispatch** (⌘6) — job queue. Every ingest / research / lint / output run, with live progress + cancel.
- **07 · Map** (⌘7) — force-directed graph view. Click legend to isolate a type, wheel to zoom, drag to pan.
- **08 · Dictation** (⌘8) — compose. Generate a report, summary, cheat sheet, deck, or infographic.
- **09 · Press** (⌘9) — settings. Model routing per job type, provider availability, backup, UI tokens.`,
  },
  {
    slug: "keyboard-shortcuts",
    title: "Keyboard shortcuts",
    section: "Navigation",
    summary:
      "⌘K palette · ? help · ⌘1–⌘9 page nav · Esc closes modals.",
    body: `- **⌘K** — command palette. Natural-language intents: \`go to lint\`, \`find quantum error correction\`, \`generate a deck about X\`, \`switch project ai/llms\`, \`ask WikiLM …\`.
- **?** — open this help modal from anywhere.
- **⌘1 – ⌘9** — jump to each of the nine pages.
- **Esc** — close any open modal (help, outputs, research, lint-fix preview).
- **⌘T** — open the *Tweaks* panel (paper theme, accent, typography, density, grain).

Inside the Wiki reader: arrow keys move between pages in the picker; clicking a wikilink navigates; holding ⌘ while clicking opens in a background stack.`,
  },
  {
    slug: "tweaks-panel",
    title: "Tweaks panel",
    section: "Navigation",
    summary:
      "Top-right dotted-sliders icon. Change paper theme, ink accent, serif face, size, leading, grain. Live.",
    body: `The Tweaks panel lives behind the dotted-sliders icon in the topbar (or ⌘T). Everything is live — no reload.

Available controls:
- **Paper theme** — Paper / Stone / Celadon / Night (four palette presets).
- **Ink accent** — five accent colours for links, pill highlights, active states.
- **Serif face** — Fraunces / Crimson / Bitter / Source Serif (four display faces).
- **Size scale** — small / medium / large.
- **Density** — comfortable / compact / tight (row heights, padding).
- **Grain** — paper texture opacity (0 = crisp, 100 = visible grain).

Preferences persist in localStorage per device.`,
  },

  // ── Troubleshooting ─────────────────────────────────────────────────
  {
    slug: "retry-a-failed-source",
    title: "Retry a failed source",
    section: "Troubleshooting",
    summary:
      "On Intake, failed rows show a Retry button. Same ingest endpoint — the row goes back to ingesting.",
    body: `If a source ends up in *Failed* status, the Intake row shows a **Retry** button next to Delete.

Clicking Retry sends the source back through the ingest path — same endpoint that pending→approve uses. Status flips to *ingesting* immediately; the model re-runs the ingest prompt with the raw file still on disk.

Common reasons ingestion fails:
- **Provider unavailable** — check Press → Provider pings. Swap to a working provider or wait.
- **Rate limited** — especially on Gemini Pro. Switch to Flash or wait ~20s.
- **Auth failed** — expired/bad API key. Re-auth.
- **Model refused / returned garbage** — check \`jobs.error\` on Dispatch for the model's exact message.

Retrying after a transient failure usually works on the first click. Retrying after a permanent failure will fail the same way — check the error first.`,
  },
  {
    slug: "provider-errors",
    title: "Provider errors",
    section: "Troubleshooting",
    summary:
      "Classified error codes: provider_unavailable, model_not_found, rate_limited, auth_failed. Each has an actionable title.",
    body: `Provider failures get classified rather than dumped as raw stack traces. You'll see:

- **provider_unavailable** — the provider's endpoint didn't respond. Check Press pings; may be a local Ollama not running, or a transient network issue.
- **model_not_found** — the model ID isn't recognised by the provider. Happens with bare \`gemini-3-pro\` (needs \`-preview\` suffix) or a typo in Ollama model name.
- **rate_limited** — provider-level quota hit. Gemini Pro is rate-limited aggressively; switch to Flash. Wait a bit and retry.
- **auth_failed** — expired API key, wrong org, missing \`gemini\` CLI auth. Re-authenticate.

Messages appear as toast titles on Intake / Dispatch / Compose with actionable descriptions. The Dispatch page (⌘6) shows the full error detail per job.`,
  },
  {
    slug: "synthesis-stale",
    title: "Synthesis looks stale",
    section: "Troubleshooting",
    summary:
      "Synthesis only runs when the queue is fully idle. Check Dispatch — if jobs are running, synthesis is queued.",
    body: `The project overview (Synthesis page) is intentionally refreshed *only* when the entire job queue is idle. No in-flight ingests, no running Ollama/Gemini/Claude subprocesses.

If you ingested several sources quickly and the synthesis hasn't updated yet, check **Dispatch** — one or more jobs are probably still running. Synthesis will flush as soon as the last one finishes.

If the queue is idle and synthesis still looks stale, a synthesis trigger may have been missed (this is rare — all ingest / research / approve / retry / lint-fix paths trigger it). Trigger a manual refresh by running a lint pass, or by approving another small pending source.

Note: synthesis only updates the project overview page. If an individual concept or entity page looks out of date, that's fixed by re-ingesting a source that touches it, not by synthesis.`,
  },
  {
    slug: "dev-server-restart",
    title: "When to restart the dev server",
    section: "Troubleshooting",
    summary:
      "After editing `claude-runner.ts` or other server-side library code. UI files hot-reload; server-side doesn't always.",
    body: `The Next.js dev server hot-reloads most files, but a few patterns require a full restart:

- Changes to \`src/lib/claude-runner.ts\` — the module caches; edits don't take effect until restart.
- Changes to \`next.config.ts\` or environment variables.
- Changes to database schema or migrations.
- Changes to the MCP server (\`mcp/\` package — needs rebuild + client restart).

Kill the dev server (\`ctrl-C\`), restart with \`npm run dev\`. The DB and all your data are untouched.

If hot-reload seems broken for a client component — a toast never updates, a prop doesn't flow — hard-refresh the browser (⌘⇧R).`,
  },
];

export function getHelpTopic(slug: string): HelpTopic | undefined {
  return helpTopics.find((t) => t.slug === slug);
}

export function topicsBySection(section: HelpSection): HelpTopic[] {
  return helpTopics.filter((t) => t.section === section);
}

/**
 * A compact, grouped digest of every help topic — one bullet per topic,
 * using just the slug/title/summary. Fits in ~800 tokens. Included in the
 * chat prompt preamble so the model can answer how-to questions inline
 * and cite topic slugs the user can open in /help.
 */
export function buildHelpDigest(): string {
  const lines: string[] = [
    "# WikiLM help digest",
    "",
    "You have access to this condensed help knowledge bank. If the user asks how to use WikiLM — how to add a source, run lint, generate an output, etc. — answer from this digest and point them at the full topic via `/help#<slug>`. Do not fabricate features not listed here.",
    "",
  ];
  for (const section of HELP_SECTIONS) {
    const topics = topicsBySection(section);
    if (topics.length === 0) continue;
    lines.push(`## ${section}`);
    for (const t of topics) {
      lines.push(`- **${t.title}** (\`${t.slug}\`) — ${t.summary}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
