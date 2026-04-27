import TurndownService from "turndown";

/**
 * Convert raw HTML (typically a clipped webpage) to markdown using
 * Turndown. Lazily instantiated so callers that never clip web content
 * don't pay the import cost.
 *
 * Strips the obvious noise that web clippers don't want in the wiki:
 * scripts, styles, navigation chrome, and footer/aside containers.
 */
let service: TurndownService | null = null;

export function htmlToMarkdown(html: string): string {
  if (!service) {
    service = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });
    service.remove(["script", "style", "noscript", "iframe", "nav", "footer", "aside"]);
  }
  return service.turndown(html);
}
