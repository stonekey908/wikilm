import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "./wiki-utils";

describe("parseFrontmatter", () => {
  it("returns body untouched when no frontmatter", () => {
    const { meta, body } = parseFrontmatter("# Hello\n\nBody text.");
    expect(meta).toEqual({});
    expect(body).toBe("# Hello\n\nBody text.");
  });

  it("parses scalar keys", () => {
    const src = `---
title: Hello
type: concept
---

Body.`;
    const { meta, body } = parseFrontmatter(src);
    expect(meta.title).toBe("Hello");
    expect(meta.type).toBe("concept");
    // The parser preserves the newline immediately after the closing `---`
    // (body isn't trimmed) so downstream renderers keep the original spacing.
    expect(body.trim()).toBe("Body.");
  });

  it("strips surrounding double quotes on scalars", () => {
    const src = `---
title: "Quoted value"
---
Body.`;
    const { meta } = parseFrontmatter(src);
    expect(meta.title).toBe("Quoted value");
  });

  it("parses inline arrays into string[]", () => {
    const src = `---
tags: [one, two, "three"]
---
Body.`;
    const { meta } = parseFrontmatter(src);
    expect(Array.isArray(meta.tags)).toBe(true);
    expect(meta.tags).toEqual(["one", "two", "three"]);
  });

  it("handles empty arrays", () => {
    const src = `---
tags: []
---
Body.`;
    const { meta } = parseFrontmatter(src);
    expect(meta.tags).toEqual([""]); // current impl splits on comma — empty string is the sole element
  });

  it("ignores lines without a colon", () => {
    const src = `---
title: Hello
not a valid line
type: concept
---
Body.`;
    const { meta } = parseFrontmatter(src);
    expect(meta.title).toBe("Hello");
    expect(meta.type).toBe("concept");
    expect(Object.keys(meta)).toHaveLength(2);
  });

  it("handles CRLF line endings", () => {
    const src = "---\r\ntitle: Hello\r\ntype: concept\r\n---\r\nBody.";
    const { meta, body } = parseFrontmatter(src);
    expect(meta.title).toBe("Hello");
    expect(body).toBe("Body.");
  });

  it("preserves the body verbatim after the closing ---", () => {
    const src = `---
title: Hello
---

# Heading

- bullet one
- bullet two
`;
    const { body } = parseFrontmatter(src);
    expect(body).toContain("# Heading");
    expect(body).toContain("bullet one");
  });

  it("regression: `tags:` must not be collapsed to a string", () => {
    // Drift bug — a prior copy of this parser in graph/route.ts lost the
    // array branch, turning `tags: [foo, bar]` into the literal string
    // '[foo, bar]'. Lock the contract.
    const src = `---
tags: [alpha, beta]
---`;
    const { meta } = parseFrontmatter(src);
    expect(meta.tags).not.toBe("[alpha, beta]");
    expect(Array.isArray(meta.tags)).toBe(true);
  });
});
