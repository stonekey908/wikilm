# Handoff: WikiLM — Editorial Brutalist Frontend

## Overview

WikiLM is a **personal wiki grown by an LLM** — the user drops in sources (PDFs, URLs, voice memos, notes), Claude synthesizes wiki pages, links them into a graph, and produces briefs/cheat-sheets/decks on demand. This handoff covers the **full frontend redesign** in an editorial-brutalist aesthetic — cream newsprint, hairline rules, Fraunces display + Instrument Serif italic accents + JetBrains Mono for chrome, editor's-red marginalia.

The design is one single-page app with six top-level sections (Ledger, Wiki, Intake, Dispatch, Map, Dictation), a ⌘K palette, a "Set type" (Tweaks) panel, and a handful of flows (approve a source, cancel a job, commission research, change output format).

## About the Design Files

The files in this bundle are **design references created in HTML** — high-fidelity prototypes that demonstrate intended look, layout, typography, animation, and micro-interactions. They are **not** production code to copy directly.

Your task is to **recreate these designs in the target codebase's existing environment** (React/Vue/Svelte/SwiftUI/etc.) using its established patterns, component library, and styling conventions. If no environment exists yet, choose the most appropriate modern stack — **React + Vite + TypeScript + CSS Modules (or Tailwind with an extended theme)** is a good default for this design since it relies heavily on custom typography, CSS grid, and fine-grained CSS variables.

Preserve the aesthetic precisely. Do not substitute Inter for Fraunces, do not round corners, do not soften the hairlines, do not replace the editor's-red with a brand teal. The identity lives in those details.

## Fidelity

**High-fidelity.** The mock is pixel-accurate in typography, colors, spacing, rule weights, and animation timing. Recreate pixel-perfectly using the codebase's libraries and patterns — match the exact values given in the **Design Tokens** section below.

## Global System

### Shell

- **Grid**: `grid-template-columns: 260px 1fr` (`60px 1fr` when sidebar collapsed)
- **Height**: `100vh`, `overflow: hidden` at body level; only `.content` scrolls
- **Topbar**: 56px, `border-bottom: 1.5px solid var(--rule)` with a second faint rule 4px below for a "letterpress" double-line
- **Content padding**: `0 28px 80px`, `max-width: 1440px`, centered

### Typography

Three families, strictly zoned:

1. **Fraunces** — all display and editorial body copy. Use `font-variation-settings: "opsz" 144` on headlines ≥ 32px. `font-feature-settings: "ss01","ss02"`. Weight range 300–900. Letter-spacing: `-0.045em` at 72px+, `-0.025em` at 24–40px, `-0.01em` at body.
2. **Instrument Serif** — italic accents only (words like "*large* language models", column subheads like "*pages*", pull quotes, the `em` inside h1s). Always italic, weight 400, tinted with `var(--accent)` 80% of the time. This is the single most characteristic element — use it liberally anywhere you'd normally bold or italicize.
3. **JetBrains Mono** — all chrome, metadata, labels, folio numbers, stats values, timestamps, button text, kbd hints. 9.5–12.5px. Uppercase `.caps` variant uses `letter-spacing: 0.12–0.22em`.

Body default: JetBrains Mono 12.5px / 1.55. Editorial prose: Fraunces 18px / 1.62.

Drop cap: Fraunces 900, opsz 144, float left, 84px, color `var(--accent)`, on the first paragraph of every article (`.lede::first-letter`).

### Paper & grain

`body::before` and `body::after` layer a radial-gradient paper grain + SVG fractal-noise overlay, both with `mix-blend-mode: multiply` on light themes and `screen` on Carbon. Controlled by `[data-grain="true|false"]` on body. Do not skip this — the texture is load-bearing for the aesthetic.

### Rule hierarchy

- **Heavy**: `1.5–2.5px solid var(--rule)` — section dividers, masthead bottoms
- **Hairline**: `1px solid var(--rule-faint)` — column gutters, row separators
- **Dotted**: `1px dotted var(--rule-faint)` — entry rows, byline-strip columns
- **Dashed**: `1px dashed var(--rule-faint)` — deck separator under article decks, side-date

Use dotted for list rows; dashed for semantic separators between logical sections of the same card; solid for page-level frames.

### Numbering system

Every meaningful list uses small-caps Roman numerals (i, ii, iii, iv) or JetBrains Mono `01–99` section numbers in `var(--ink-4)` at 9.5–10px with `letter-spacing: 0.1em`. Major headings get a `§ 01` prefix in mono, one line above the serif title.

## Design Tokens

### Colors — Cream (default, "Paper")

```css
--paper: #f5f0e6;   /* page background */
--paper-2: #ede6d6; /* elevated / hover */
--paper-3: #e3d9c4; /* press / deeper */
--ink: #0f0e0c;     /* primary text, rules */
--ink-2: #2a2825;   /* secondary text */
--ink-3: #514d46;   /* tertiary text */
--ink-4: #8a8377;   /* labels, meta */
--ink-5: #b3aa97;   /* disabled */
--rule: #0f0e0c;
--rule-faint: rgba(15,14,12,0.18);
--rule-ghost: rgba(15,14,12,0.10);
--red: #b91c1c;
--red-wash: rgba(185,28,28,0.08);
--blue: #1e3a8a;
--blue-wash: rgba(30,58,138,0.08);
--green: #3f6212;
--amber: #a16207;
--highlight: #f7e98c;
```

### Colors — Stone (preferred, user-selected)

```css
--paper: #eae6df;
--paper-2: #e0dbd1;
--paper-3: #d3ccbe;
--ink: #1a1815;
--ink-2: #33302b;
--ink-3: #5a554d;
--ink-4: #8f887c;
--ink-5: #b5ad9f;
```

### Colors — Celadon

```css
--paper: #e8ebe2;
--paper-2: #d6dcc9;
--paper-3: #c7cfb7;
--ink: #14201a;
```

### Colors — Carbon (dark)

```css
--paper: #0c0b09;
--paper-2: #141210;
--paper-3: #1c1a17;
--ink: #f5f0e6;
--ink-2: #d8d1c0;
--ink-3: #9c9688;
--ink-4: #6a645a;
--ink-5: #433f38;
--red: #ef6666;
--blue: #7aa7ff;
--highlight: rgba(247,233,140,0.22);
```
On Carbon, invert both `::before` and `::after` to `mix-blend-mode: screen`.

### Accents (swatch picker)

Map `data-accent` → `--accent`:
- `red` → `#b91c1c`
- `blue` → `#1e3a8a`
- `green` → `#3f6212` ← **user's current choice**
- `amber` → `#a16207`
- `ink` → `#0f0e0c` (mono monochrome mode)

Each accent also sets `--accent-wash` = the color at 8–10% alpha.

### Density

`data-density` controls row padding:
- `cozy`: `--row-y: 8px`, `--row-x: 10px`
- `comfy`: `--row-y: 11px`, `--row-x: 14px` (default)
- `airy`: `--row-y: 16px`, `--row-x: 18px`

### Spacing scale

4, 6, 8, 10, 12, 14, 16, 18, 22, 24, 26, 28, 30, 36, 42, 50 px. No unique magic numbers outside this scale.

### Border radius

**Zero.** Everything square. Exceptions:
- Buttons: 0
- Cards: 0
- Inputs: 0
- The "wax seal" brand mark in the sidebar head: `border-radius: 50%` with `transform: rotate(-6deg)`
- Pulsing node in graph: circle
- Status dots: circle

Do not introduce rounded corners anywhere else. This is a differentiator.

### Shadows

Only **box-shadow offset without blur** (brutalist "hard drop"):
- Popovers (⌘K palette, hover preview, Tweaks panel): `6px 6px 0 var(--ink)` up to `10px 10px 0 var(--ink)`
- Sidebar toggle button on hover: `3px 3px 0 var(--ink)` with 1px translate
No soft shadows, no blurs.

### Motion

- Page transitions (`.view.active`): `vfade` 340ms `cubic-bezier(.2,.7,.2,1)`, translateY(6→0) + opacity
- Popovers (`pop`): 240–260ms same easing, from offset translate + opacity
- Hover states: 120–180ms linear or default ease, background/color/border-color only
- Shimmer on running progress bars: 1.4s linear infinite, linear-gradient sweep at 200% bg-size
- Pulse on status-run dot: 1.4s infinite, opacity 1 ↔ 0.3
- Graph focus node: radial `<animate>` r from 22 to 50, opacity 0.6 to 0, 2.4s infinite
- Drop caret blink: 0.9s step-end infinite
- All animations honor `prefers-reduced-motion: reduce` → disable the view fade at minimum

## Screens

### 01 · The Ledger (Dashboard)

**Purpose.** At-a-glance snapshot of the user's wiki + inbox of things Claude wants them to review.

**Layout.**
- `.ledger-head`: 2-col (title | dateline), `padding: 36px 0 24px`, `border-bottom: 2.5px solid var(--rule)` with a second 1px rule 6px below
- `h1`: Fraunces 84px, weight 400, letter-spacing −0.045em, line-height 0.9, opsz 144. Two lines ("Good afternoon,\n*Ellie.*"). The name is Instrument Serif italic in `var(--accent)`
- `.dateline`: JetBrains Mono 10.5px, uppercase, letter-spacing 0.1em, text-align right, line-height 1.8. Four rows: weekday · date · stat delta · job count
- `.run`: 4-column grid of stat cells separated by 1px dotted gutters. Each cell:
  - `idx`: mono 9.5px uppercase "i/ii/iii/iv"
  - `lab`: Fraunces 700 12px uppercase
  - `val`: Fraunces 300, opsz 144, **56px**, letter-spacing −0.03em, tabular-nums
  - `delta`: mono 10.5px; `b` element in `var(--accent)` 700
  - `spark`: tiny 60×22 SVG polyline bottom-right, 55% opacity
- `.ledger-body`: 3-col grid 1.3fr / 0.9fr / 1fr, separated by 1px dotted gutters
  - Col 1: **Recent pages** — `.entry` rows, 3-col grid (Roman num | title+sub | when). Title is Fraunces 17px with Instrument italic accent word
  - Col 2: **Marginalia** — `.mark` cards with 3px left accent bar (red / blue / default accent). Heading in Fraunces 900 11px uppercase, tinted to match bar. Body in Fraunces 12px. "Merge/Dismiss/Reconcile/Attach" actions as `.btn.sm`
  - Col 3: **Dispatch** (job rows, stacked) + **Research** input card below

**Copy.** "Good afternoon, *Ellie.*" · Dateline rows: "Thursday" · "**18 April** · 2026" · "12 pages **↑ this week**" · "2 jobs · 3 nudges". Stat labels: Pages 284, Edges 1,120, Sources 47, Spend · 30d $14.20. Nudges: Merge candidate (Toolformer duplicate), Conflict (ReAct vs Agent memory on working-memory scope), Orphan (Function calling with no backlinks).

### 02 · Wiki (Article reader)

**Layout.**
- `.art-masthead`: h1 at **112px**, weight 300, letter-spacing −0.055em, line-height 0.88. Two lines. "Tool use in *large*\nlanguage models." — first *large* is Instrument italic in accent color
- `.kicker` row above: mono 10px uppercase, 5 items separated by "·", last item right-aligned (`margin-left: auto`) showing revision stamp
- `.deck`: Fraunces 400 **22px**, color `var(--ink-2)`, max-width 64ch, separated from h1 by a 1px dashed top border
- `.byline-strip`: 6-column grid row with stat cells — each cell has mono label at top (10px uppercase) + Fraunces 18px value below. 1px dotted vertical separators. Columns: Words / Read / Backlinks / Sources / Confidence / Weight
- `.article`: 3-col grid **1.05fr / 0.45fr / 0.18fr**, gap **42px**
  - Col 1 `.prose`: body copy
  - Col 2 `.margin`: floating card sidebar (Contents, Backlinks, Sources)
  - Col 3 `.rail`: vertical text running bottom-to-top — a decorative slug
- Prose rules:
  - `.lede`: Fraunces 500 22px, line-height 1.45, with drop cap (see Typography)
  - `p`: Fraunces 400 18px / 1.62
  - `h2`: Fraunces 400 32px, letter-spacing −0.025em, `border-top: 1px solid var(--rule-faint)`, `padding-top: 10px`, prefixed with small mono `.n` "§ 01"
  - `.wikilink`: `var(--accent)`, `border-bottom: 1px solid`, on hover background becomes `var(--highlight)` (#f7e98c yellow wash)
  - `.pull` (pull quote): Instrument Serif italic 28px, line-height 1.3, `border-left: 3px solid var(--accent)`, padding-left 18px
  - `.cite`: mono 10.5px superscript, `var(--accent)`, format `[1]`
- Margin cards: 1px solid var(--rule), 14/16 padding, `.card` heading mono 9.5px with flex-grow hairline after the label

**Hover preview** (`.preview`):
- Fixed-position 340px card with `6px 6px 0 var(--ink)` shadow
- Triggered by `.wikilink[data-preview]` with 150ms delay
- Contains: mono crumb (9.5px uppercase), Fraunces 28px title with italic em, 13px serif excerpt, row of 3 `.seal.ghost` meta chips
- Positioning: below the link, shifts up if it would overflow viewport bottom

### 03 · The Intake (Sources)

**Layout.**
- `.sec-head`: h1 Fraunces **72px** "The *Intake.*", rail-meta right-aligned (mono 10.5px uppercase, 3 lines)
- `.sources-layout`: 2-col grid **1fr / 280px**, gap 42px
- Left col: `.drop` (2px dashed border, 30px padding, centered. Fraunces 28px heading + mono 10.5px subhead) → then `.intake` list
- `.intake-row`: 4-col grid **32px / 80px / 1fr / auto**, gap 16px, `border-bottom: 1.5px solid var(--rule)`, 20px vertical padding
  - Col 1: Roman numeral in mono
  - Col 2: `.stamp-card` — 80px wide, aspect 1/1.28, cross-hatched 45° striped background using `repeating-linear-gradient`, with a `.k` mono kind (PDF/URL/VOICE/MD) and `.s` Fraunces 900 32px SKU number
  - Col 3: `.body` — Fraunces 500 22px title + mono 10px sub + Fraunces 14px extract with `b` accents
  - Col 4: `.acts` — vertical stack of a `.seal` + primary/ghost/red buttons

**Approve flow:**
- Click `[data-approve]` → row gets `.approved` class (50% opacity + grayscale). A rotated "APPROVED" seal appears via `::after` on the stamp-card: Fraunces 900 10px red, `transform: rotate(-12deg) scale(1.2)`, 1.5px border, 0.1em tracking
- 1.1s later row fades + slides 24px right, removed at 1.6s
- Toast fires: "Approved · page synthesized"

**Right rail:** `.fr-card` blocks — Filter by kind (5 checkbox rows with counts, one active), This week (inline SVG bar chart, 7 bars, highest bar in accent color), Queue health (3 stats with dotted separators).

### 04 · The Dispatch (Jobs)

**Layout.**
- `.dispatch`: `border-top: 2.5px solid var(--rule)`
- `.dispatch-head`: inverted (`background: var(--ink); color: var(--paper)`), mono 10px uppercase 0.14em tracking, 7-col grid: `40px / 1fr / 120px / 160px / 120px / 100px / 50px`
- `.dispatch-row`: same grid, 14px vertical padding, 1px solid rule between rows
  - `.task`: Fraunces 15px 500 + mono 10px `small` below
  - `.status` seal: 1px border of currentColor, mono 9.5px 700 uppercase, inline dot. Variants: `run` (accent + wash, pulsing dot), `queue` (amber), `done` (ink-3, no fill), `fail` (red + wash), `cancel` (ink-4)
  - `.progress-line`: tiny 2px hairline bar with accent fill, shimmer animation when `.run`
  - Cancel button is `.icon-btn` (26×26) with × SVG; click → remove `.run`, swap status to "Cancelled", remove the button

### 05 · The Map (Graph)

- `.sec-head` h1: "The *Map.*" with 284 NODES / 1,120 EDGES / CLUSTERING 0.42 / LAYOUT · FORCE-DIR. in rail-meta
- `.mapwrap`: 1.5px solid border, cross-hatch graph-paper background using two linear-gradients at 42px grid
- Inline SVG 1000×600, preserveAspectRatio xMidYMid meet:
  - Lines stroke `var(--ink)` 0.7px, opacity 0.65
  - Central node: 22r circle in `var(--accent)` + a 28→50r radial pulse animation
  - Secondary cluster anchors: 12r in `var(--blue)` ("Agents"), `var(--amber)` ("Design")
  - Third-tier nodes: 5–7r in `var(--ink)` with 10px Fraunces labels
  - Tiny peripheral nodes: 3r in `var(--ink-4)`
- `.map-overlay`: absolute top-left 16/16 inset card with 4×4 hard shadow, legend rows with 9px circle dots
- `.mapwrap::before`: "Fig. I · Graph of the current wiki" in Instrument Serif italic 13px, absolutely positioned bottom-right

### 06 · Dictation (Compose)

- `.compose-hall`: max-width 880px, centered
- Kicker ("Section 06 · Dictation") mono 10px 0.22em tracking, then h1 **108px** Fraunces 300 centered: "Ask *once.*\nRead *forever.*"
- Sub: Instrument Serif italic 20px centered
- `.compose-input`: 1.5px border, 22/24 padding, grid `26px 1fr`. Left decorative 3px accent stripe at `left: -6px`. `§` glyph in Fraunces 900 24px accent, then `textarea` in Fraunces 400 20px (placeholder Instrument italic)
- `.compose-controls`: 4 format buttons (Brief/Cheat sheet/Deck/Report) — click toggles `.on`. Primary "Dictate →" on the right
- `.compose-output`: 1.5px border, 34/42 padding, 280px min-height. The word **DRAFT** sits at top-left -11px in mono 10px 0.2em tracking on paper background (overlapping the border)
- After "Dictate" click: output swaps to `<p>Dictating<span class="typing"></span></p>` for 750ms, then renders one of 4 prewritten HTML bodies (brief/sheet/deck/report). `.typing::after` = blinking `▍` in accent.

## Global Flows & Interactions

### Command palette (⌘K)

- Bound to Cmd/Ctrl+K globally
- Also opens on click of the topbar omnibar
- 640px max-width palette with hard shadow, 52vh max body
- Input is Fraunces 22px with Instrument italic placeholder
- Items grouped by "Pages / Actions / Navigate" with group headers (mono 9.5px + flex hairline)
- ↑/↓ arrows move `.act` (which adds a 3px accent left border), Enter runs it
- Empty state shows a synthetic "Ask Claude: '<query>'" row as the only action
- Close on Escape or click on backdrop

### Keyboard shortcuts

- ⌘K — palette
- ⌘1…⌘6 — jump to Ledger / Wiki / Intake / Dispatch / Map / Dictation
- ⌘Enter (in Research field) — commission

### View navigation

- `.si[data-view]` sidebar buttons call `go(view)`
- `go()` toggles `.active` on the matching `.view` section, updates the folio in topbar (`§ 01 · THE LEDGER` etc.), scrolls content to top, persists to `localStorage['wikilm-ed:view']`
- Entry rows on dashboard, pinned projects, and any `[data-open="wiki"]` all jump to the Wiki section

### Tweaks panel ("Set type")

- Floating bottom-right 320px card, shown/hidden via `data-type="toggle"` icon button in topbar or host `__activate_edit_mode` message
- Five controls, each persists both to `localStorage` and via `postMessage` to parent
- Renamed "Set type" (not "Tweaks") to match the editorial conceit

### Host messaging protocol

```js
// Register message handler FIRST
window.addEventListener('message', e => {
  if (e.data?.type === '__activate_edit_mode')   openTweaks();
  if (e.data?.type === '__deactivate_edit_mode') closeTweaks();
});

// THEN announce availability
window.parent.postMessage({ type: '__edit_mode_available' }, '*');

// On change:
window.parent.postMessage({
  type: '__edit_mode_set_keys',
  edits: { theme, accent, density, sidebar, grain }
}, '*');
```

If the target codebase doesn't have a host bridge, skip the postMessage calls — localStorage persistence alone is enough.

### Toast

- Singleton at bottom-center, `transform: translateX(-50%)`
- Inverted (ink background, paper text), 8/16 padding, mono 10.5px 700 uppercase
- Small accent dot on the left
- Fires on any significant action (approve, cancel, commission, tweak change, palette run)
- 1.6s auto-dismiss

## State Management

Minimal. Everything fits in page-level state:

```ts
type TweakState = {
  theme: 'paper' | 'stone' | 'celadon' | 'carbon';
  accent: 'red' | 'blue' | 'green' | 'amber' | 'ink';
  density: 'cozy' | 'comfy' | 'airy';
  sidebar: 'open' | 'collapsed';
  grain: boolean;
};

type AppState = {
  view: 'dashboard' | 'wiki' | 'sources' | 'jobs' | 'graph' | 'compose';
  composeFormat: 'brief' | 'sheet' | 'deck' | 'report';
  tweaks: TweakState;
  palette: { open: boolean; query: string; active: number };
};
```

Source approvals and job cancellations are **row-local** state in the current mock (DOM-driven). In a real implementation these would be server-backed; keep the optimistic UI (flash the seal, then remove) and wire to your mutation layer.

## Responsive behavior

The design targets **desktop first** (1440px design width). Breakpoints:

- `< 1200px`: collapse the 3-col Ledger body to 2 cols (merge Dispatch + Research into Col 2 below Marginalia)
- `< 1000px`: collapse to 1 col; hide `.rail` in article view; collapse Wiki 3-col to 2-col (margin goes below)
- `< 768px`: auto-collapse sidebar, swap 6-col byline strip to 3-col

Everything else uses intrinsic grid + flex sizing and reflows naturally. Do **not** change font sizes at smaller breakpoints except drop h1 from 112→72→56→40px in steps.

## Fonts

Loaded from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=JetBrains+Mono:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
```

For production, self-host via `@fontsource/fraunces`, `@fontsource/instrument-serif`, `@fontsource/jetbrains-mono`.

## Assets

No external images. Everything — sparklines, bar charts, graph, stamp cross-hatch, paper grain, noise — is inline SVG or CSS. Copy the inline SVGs verbatim; they are sized to a viewBox and will scale.

The `W` wax seal in the sidebar masthead is a styled div, not an image. The stamp on the side-foot ("EL") is likewise a styled div with rotate(-2deg).

## Files

- `wikilm-app-v2.html` — the full reference prototype (copy as-is into this handoff folder). Open in a browser to see every interaction live. All CSS is inline in one `<style>` block; all JS is inline in one `<script>` block at the bottom. Read it top-to-bottom for anything this README doesn't cover.

## Implementation tips for Claude Code

1. **Start with the tokens.** Port the CSS variables first — all four themes, all five accents, all three densities. Get `data-theme`, `data-accent`, `data-density`, `data-side`, `data-grain` toggles working on `body`. Everything downstream hangs off this.
2. **Then the shell.** Build the sidebar, topbar, and view-switcher as the frame. Wire the six routes or view states. Get ⌘K and ⌘1–⌘6 working against empty placeholders.
3. **Then the Ledger.** It has the most elements at the smallest scale — stat run, entry rows, marks, job rows, research input. Getting it right validates your type system.
4. **Then the Wiki article.** This is where Fraunces + Instrument Serif + drop caps + pull quotes all come together. If this feels wrong, your font loading or opsz is off.
5. **Intake, Dispatch, Map, Dictation** are straightforward adaptations of the first three.
6. **Polish.** Hover previews, ⌘K palette animations, approve/cancel transitions, toast, paper grain. These are the 20% that carry 80% of the aesthetic.
7. **Do not soften.** Resist the urge to round corners, add shadows-with-blur, swap to a default sans, or replace the Instrument Serif italics with `<em>` defaults. The brutalist editorial character is the product.
