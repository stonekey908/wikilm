import { describe, it, expect } from "vitest";
import {
  HELP_SECTIONS,
  buildHelpDigest,
  getHelpTopic,
  helpTopics,
  topicsBySection,
} from "./help";

describe("help topic registry", () => {
  it("every topic has a unique slug", () => {
    const slugs = helpTopics.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every topic has a recognised section", () => {
    for (const t of helpTopics) {
      expect(HELP_SECTIONS).toContain(t.section);
    }
  });

  it("every topic has non-empty title/summary/body", () => {
    for (const t of helpTopics) {
      expect(t.title.trim()).not.toBe("");
      expect(t.summary.trim()).not.toBe("");
      expect(t.body.trim()).not.toBe("");
    }
  });
});

describe("topicsBySection / getHelpTopic", () => {
  it("topicsBySection returns only topics in that section", () => {
    const concepts = topicsBySection("Concepts");
    expect(concepts.length).toBeGreaterThan(0);
    for (const t of concepts) {
      expect(t.section).toBe("Concepts");
    }
  });

  it("getHelpTopic returns the matching topic or undefined", () => {
    const first = helpTopics[0];
    expect(getHelpTopic(first.slug)).toEqual(first);
    expect(getHelpTopic("not-a-real-slug")).toBeUndefined();
  });
});

describe("buildHelpDigest", () => {
  it("mentions every topic slug + title", () => {
    const digest = buildHelpDigest();
    for (const t of helpTopics) {
      expect(digest).toContain(t.slug);
      expect(digest).toContain(t.title);
    }
  });

  it("groups topics under each section header that has topics", () => {
    const digest = buildHelpDigest();
    for (const section of HELP_SECTIONS) {
      if (topicsBySection(section).length > 0) {
        expect(digest).toContain(`## ${section}`);
      }
    }
  });

  it("starts with the WikiLM help-digest preamble", () => {
    const digest = buildHelpDigest();
    expect(digest.startsWith("# WikiLM help digest")).toBe(true);
  });
});
