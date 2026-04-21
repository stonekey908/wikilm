# Project: quantum

You are maintaining the `quantum` WikiLM project. Its scope is this directory only.

## Paths

All wiki paths you use must be **relative to this directory**, not the repo root:

- `wiki/sources/<slug>.md` — source summaries
- `wiki/entities/<slug>.md` — entity pages
- `wiki/concepts/<slug>.md` — concept pages
- `wiki/comparisons/<slug>.md` — comparison pages
- `wiki/synthesis/project-overview.md` — project synthesis
- `wiki/queries/<slug>.md` — preserved question answers
- `wiki/outputs/<YYYY-MM-DD>-<type>-<slug>.md` — generated outputs (reports, decks, cheat sheets, summaries, infographics)
- `wiki/index.md` — this project's catalog
- `wiki/log.md` — this project's operation log

## Rules

1. **Never write outside `./wiki/`** in this project. Writes to any path outside this directory (e.g. `../`, `../../wiki/`, absolute repo-root paths) are forbidden.
2. **Cross-project wikilinks** use the absolute-slug form: `[[other-project/page-name]]`. Within this project, bare `[[page-name]]` resolves locally.
3. Apply every other rule from the repo-level WikiLM CLAUDE.md (page types, frontmatter, links) — but scoped to this project's wiki/.
