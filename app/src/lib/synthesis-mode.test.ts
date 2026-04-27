import { describe, it, expect } from "vitest";
import { shouldRunSynthesis } from "./claude-runner";

describe("shouldRunSynthesis", () => {
  it("auto mode + no force → run", () => {
    expect(shouldRunSynthesis("auto", false)).toBe(true);
  });

  it("auto mode + force → run", () => {
    expect(shouldRunSynthesis("auto", true)).toBe(true);
  });

  it("manual mode + no force → skip", () => {
    expect(shouldRunSynthesis("manual", false)).toBe(false);
  });

  it("manual mode + force → run (manual user fired it on demand)", () => {
    expect(shouldRunSynthesis("manual", true)).toBe(true);
  });
});
