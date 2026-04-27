import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "./clip-to-markdown";

describe("htmlToMarkdown", () => {
  it("converts headings + paragraphs to atx markdown", () => {
    const md = htmlToMarkdown("<h1>Title</h1><p>Hello world.</p>");
    expect(md).toContain("# Title");
    expect(md).toContain("Hello world.");
  });

  it("preserves links with markdown syntax", () => {
    const md = htmlToMarkdown('<p>See <a href="https://example.com">example</a> for details.</p>');
    expect(md).toContain("[example](https://example.com)");
  });

  it("converts unordered lists with the configured bullet marker", () => {
    const md = htmlToMarkdown("<ul><li>one</li><li>two</li></ul>");
    // Turndown pads bullets with spaces — assert the marker + item rather
    // than an exact "- one" string.
    expect(md).toMatch(/-\s+one/);
    expect(md).toMatch(/-\s+two/);
  });

  it("renders code blocks as fenced", () => {
    const md = htmlToMarkdown("<pre><code>const x = 1;</code></pre>");
    expect(md).toMatch(/```[\s\S]*const x = 1;[\s\S]*```/);
  });

  it("strips script + style noise that webpages carry", () => {
    const md = htmlToMarkdown(
      "<script>alert('hi')</script><style>body{color:red}</style><p>Real content.</p>"
    );
    expect(md).not.toContain("alert");
    expect(md).not.toContain("color:red");
    expect(md).toContain("Real content.");
  });

  it("strips nav / footer / aside chrome typical of articles", () => {
    const md = htmlToMarkdown(
      "<nav>Home | About</nav><article><p>The body.</p></article><footer>(c) 2026</footer>"
    );
    expect(md).not.toContain("Home | About");
    expect(md).not.toContain("(c) 2026");
    expect(md).toContain("The body.");
  });
});
