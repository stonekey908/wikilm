import { describe, it, expect } from "vitest";
import { composeSlug, slugifyName } from "./projects";

describe("slugifyName", () => {
  it("lowercases + hyphenates", () => {
    expect(slugifyName("Hello World")).toBe("hello-world");
  });

  it("collapses runs of non-alphanumerics", () => {
    expect(slugifyName("Foo -- bar / baz!")).toBe("foo-bar-baz");
  });

  it("strips leading/trailing hyphens", () => {
    expect(slugifyName("  -- hello --  ")).toBe("hello");
  });

  it("handles unicode by dropping it (ASCII-only slugs)", () => {
    expect(slugifyName("Café résumé")).toBe("caf-r-sum");
  });

  it("empty / whitespace-only input returns an empty string", () => {
    expect(slugifyName("")).toBe("");
    expect(slugifyName("   ")).toBe("");
  });
});

describe("composeSlug", () => {
  it("returns a bare slug for root projects", () => {
    expect(composeSlug(null, "AI")).toBe("ai");
  });

  it("joins parent + child with a slash", () => {
    expect(composeSlug("ai", "LLMs")).toBe("ai/llms");
  });

  it("preserves multi-level parent paths", () => {
    expect(composeSlug("ai/llms", "Multimodal")).toBe("ai/llms/multimodal");
  });

  it("slugifies the child name", () => {
    expect(composeSlug("coding", "CodeView — Desktop")).toBe("coding/codeview-desktop");
  });
});
