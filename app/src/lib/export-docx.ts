/**
 * Thin markdown → DOCX translator for chat response exports.
 *
 * Handles the subset of markdown our chat renderer actually produces:
 *   - headings h1..h4
 *   - bold / italic / inline code
 *   - unordered + ordered lists (flat — no nesting)
 *   - fenced code blocks
 *   - pipe tables
 *   - links and [[wikilinks]]
 *
 * No nested lists, no images, no HTML — the chat renderer already rejects
 * those on the rendering side, and adding them here would bloat the bundle
 * without improving the real use case (save a response, share it).
 */

import {
  AlignmentType,
  Document,
  HeadingLevel,
  ExternalHyperlink,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IParagraphOptions,
} from "docx";

// ─── Inline runs ──────────────────────────────────────────────────────────

type InlineNode =
  | { kind: "text"; text: string; bold?: boolean; italic?: boolean; code?: boolean }
  | { kind: "link"; text: string; url: string }
  | { kind: "wikilink"; text: string };

/**
 * Parse a single line / paragraph into inline nodes. Handles nested emphasis
 * conservatively — matches outermost-first, leaves unmatched markers as
 * literal text so malformed markdown doesn't break the export.
 */
function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  // Order matters: code first (its backticks shouldn't be interpreted as emphasis),
  // then explicit [text](url) links, then [[wikilinks]], then bold, then italic.
  const pattern =
    /(`[^`]+`)|(\[([^\]]+)\]\(([^)]+)\))|(\[\[([^\]]+)\]\])|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/;
  let rest = text;
  while (rest.length > 0) {
    const match = rest.match(pattern);
    if (!match) {
      nodes.push({ kind: "text", text: rest });
      break;
    }
    if (match.index! > 0) {
      nodes.push({ kind: "text", text: rest.slice(0, match.index) });
    }
    if (match[1]) {
      nodes.push({ kind: "text", text: match[1].slice(1, -1), code: true });
    } else if (match[2]) {
      nodes.push({ kind: "link", text: match[3], url: match[4] });
    } else if (match[5]) {
      nodes.push({ kind: "wikilink", text: match[6] });
    } else if (match[7]) {
      nodes.push({ kind: "text", text: match[8], bold: true });
    } else if (match[9]) {
      nodes.push({ kind: "text", text: match[10], italic: true });
    }
    rest = rest.slice(match.index! + match[0].length);
  }
  return nodes;
}

function runsFromInline(nodes: InlineNode[]): (TextRun | ExternalHyperlink)[] {
  const runs: (TextRun | ExternalHyperlink)[] = [];
  for (const n of nodes) {
    if (n.kind === "text") {
      runs.push(
        new TextRun({
          text: n.text,
          bold: n.bold,
          italics: n.italic,
          font: n.code ? "Menlo" : undefined,
        })
      );
    } else if (n.kind === "link") {
      runs.push(
        new ExternalHyperlink({
          link: n.url,
          children: [new TextRun({ text: n.text, style: "Hyperlink" })],
        })
      );
    } else if (n.kind === "wikilink") {
      // Wikilinks are internal to WikiLM. In an exported Word doc they'd be
      // dead refs, so render as underlined plain text — reads naturally and
      // makes it clear this is a cross-reference without the reader needing
      // to chase it down.
      runs.push(new TextRun({ text: n.text, underline: {} }));
    }
  }
  return runs;
}

// ─── Block parsing ────────────────────────────────────────────────────────

type Block =
  | { kind: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "code"; lines: string[]; lang?: string }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "hr" };

function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const codeStart = line.match(/^```(\w*)\s*$/);
    if (codeStart) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // consume closing ```
      blocks.push({ kind: "code", lines: codeLines, lang: codeStart[1] || undefined });
      continue;
    }

    // Horizontal rule
    if (/^\s*---+\s*$/.test(line)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        kind: "heading",
        level: headingMatch[1].length as 1 | 2 | 3 | 4,
        text: headingMatch[2],
      });
      i++;
      continue;
    }

    // Pipe table: header row | --- | ---
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s|:-]+\|?\s*$/.test(lines[i + 1])) {
      const header = splitTableRow(line);
      i += 2; // skip separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push({ kind: "table", header, rows });
      continue;
    }

    // Unordered list (consume contiguous block)
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — consume contiguous non-blank, non-structural lines
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "paragraph", text: paraLines.join(" ") });
  }

  return blocks;
}

function splitTableRow(row: string): string[] {
  return row
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

// ─── Block → docx element ─────────────────────────────────────────────────

const HEADING_LEVEL_MAP = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
} as const;

function blockToDocx(block: Block): (Paragraph | Table)[] {
  if (block.kind === "heading") {
    return [
      new Paragraph({
        heading: HEADING_LEVEL_MAP[block.level],
        children: runsFromInline(parseInline(block.text)),
      }),
    ];
  }

  if (block.kind === "paragraph") {
    return [
      new Paragraph({
        children: runsFromInline(parseInline(block.text)),
        spacing: { after: 120 },
      }),
    ];
  }

  if (block.kind === "ul" || block.kind === "ol") {
    const numId = block.kind === "ol" ? "num-default" : undefined;
    return block.items.map(
      (item) =>
        new Paragraph({
          children: runsFromInline(parseInline(item)),
          ...(block.kind === "ul"
            ? { bullet: { level: 0 } }
            : ({ numbering: { reference: numId!, level: 0 } } as Partial<IParagraphOptions>)),
        })
    );
  }

  if (block.kind === "code") {
    return block.lines.map(
      (l) =>
        new Paragraph({
          children: [new TextRun({ text: l || " ", font: "Menlo", size: 20 })],
          shading: { fill: "F3F3F3" },
        })
    );
  }

  if (block.kind === "hr") {
    return [
      new Paragraph({
        border: {
          bottom: { color: "999999", size: 6, space: 1, style: "single" },
        },
      }),
    ];
  }

  if (block.kind === "table") {
    const rows: TableRow[] = [];
    rows.push(
      new TableRow({
        children: block.header.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell, bold: true })],
                  alignment: AlignmentType.LEFT,
                }),
              ],
              shading: { fill: "F3F3F3" },
            })
        ),
      })
    );
    for (const row of block.rows) {
      rows.push(
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: runsFromInline(parseInline(cell)),
                  }),
                ],
              })
          ),
        })
      );
    }
    return [
      new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
    ];
  }

  return [];
}

// ─── Public API ───────────────────────────────────────────────────────────

export function markdownToDocumentBlob(
  markdown: string,
  title = "WikiLM export"
): Promise<Blob> {
  const blocks = parseBlocks(markdown);
  const children: (Paragraph | Table)[] = [];
  for (const b of blocks) {
    children.push(...blockToDocx(b));
  }

  const doc = new Document({
    title,
    numbering: {
      config: [
        {
          reference: "num-default",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
              style: {
                paragraph: { indent: { left: 720, hanging: 360 } },
              },
            },
          ],
        },
      ],
    },
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}

/**
 * Pull a reasonable filename from the first heading or first line of the
 * markdown. Falls back to the date.
 */
export function filenameFromMarkdown(markdown: string, ext: "md" | "docx"): string {
  const firstHeading = markdown.match(/^#+\s+(.+)$/m)?.[1];
  const firstLine = markdown.split("\n").find((l) => l.trim());
  const seed = (firstHeading || firstLine || "wikilm-export").slice(0, 50);
  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "wikilm-export";
  const date = new Date().toISOString().slice(0, 10);
  return `${slug}-${date}.${ext}`;
}
