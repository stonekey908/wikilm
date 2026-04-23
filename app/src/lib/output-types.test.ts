import { describe, it, expect } from "vitest";
import {
  buildOutputBaseSlug,
  enabledOutputTypes,
  getOutputType,
  nudgeSlug,
} from "./output-types";

describe("nudgeSlug", () => {
  it("returns empty string for undefined / empty input", () => {
    expect(nudgeSlug()).toBe("");
    expect(nudgeSlug("")).toBe("");
    expect(nudgeSlug("   ")).toBe("");
  });

  it("lowercases + hyphenates non-alphanumerics", () => {
    expect(nudgeSlug("Write for a Technical Audience")).toBe(
      "write-for-a-technical-audience"
    );
  });

  it("strips leading/trailing hyphens", () => {
    expect(nudgeSlug("  hello, world!  ")).toBe("hello-world");
  });

  it("caps length at 40 characters", () => {
    const long = "the quick brown fox jumps over the lazy dog many times over";
    const out = nudgeSlug(long);
    expect(out.length).toBeLessThanOrEqual(40);
  });
});

describe("buildOutputBaseSlug", () => {
  it("uses the YYYY-MM-DD-HHMM prefix so regenerations don't overwrite", () => {
    const slug = buildOutputBaseSlug("cheat", "project");
    expect(slug).toMatch(/^\d{4}-\d{2}-\d{2}-\d{4}-cheat$/);
  });

  it("appends -subtree when scope is subtree", () => {
    const slug = buildOutputBaseSlug("report", "subtree");
    expect(slug).toMatch(/-report-subtree$/);
  });

  it("appends a slugified nudge tail when provided", () => {
    const slug = buildOutputBaseSlug("deck", "project", "Audience: technical");
    expect(slug).toMatch(/-deck-audience-technical$/);
  });

  it("combines subtree + nudge in the right order", () => {
    const slug = buildOutputBaseSlug("summary", "subtree", "Commercial framing");
    expect(slug).toMatch(/-summary-subtree-commercial-framing$/);
  });
});

describe("getOutputType / enabledOutputTypes", () => {
  it("returns null for unknown ids", () => {
    expect(getOutputType("not-a-real-type")).toBeNull();
  });

  it("returns a defined type for known ids", () => {
    const report = getOutputType("report");
    expect(report).not.toBeNull();
    expect(report?.id).toBe("report");
  });

  it("enabledOutputTypes returns the full known-type set", () => {
    const ids = enabledOutputTypes().map((t) => t.id).sort();
    expect(ids).toContain("report");
    expect(ids).toContain("cheat");
    expect(ids).toContain("summary");
    expect(ids).toContain("deck");
    expect(ids).toContain("infographic");
  });

  it("every enabled type declares a primary extension", () => {
    for (const t of enabledOutputTypes()) {
      expect(typeof t.primaryExt).toBe("string");
      expect(t.primaryExt.length).toBeGreaterThan(0);
    }
  });
});
