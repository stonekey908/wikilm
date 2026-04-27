import { describe, it, expect } from "vitest";
import { isMovableSourceStatus } from "./route";

describe("isMovableSourceStatus", () => {
  it("allows pending", () => {
    expect(isMovableSourceStatus("pending")).toBe(true);
  });

  it("rejects ingesting (job in flight — moving the file would race the subprocess)", () => {
    expect(isMovableSourceStatus("ingesting")).toBe(false);
  });

  it("rejects ingested (would orphan generated wiki pages)", () => {
    expect(isMovableSourceStatus("ingested")).toBe(false);
  });

  it("rejects failed (must approve a retry path before moving)", () => {
    expect(isMovableSourceStatus("failed")).toBe(false);
  });
});
