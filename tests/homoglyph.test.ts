import { describe, expect, it } from "vitest";
import { compareHomoglyphs, homoglyphSkeleton } from "../src/signals/homoglyph.js";

describe("Unicode homoglyph comparison", () => {
  it.each([
    ["lоdash", "lodash"],
    ["reаct", "react"],
    ["exρress", "express"],
    ["tγpe", "type"],
  ])("maps supported Greek and Cyrillic characters in %s", (lookalike, ascii) => {
    expect(compareHomoglyphs(lookalike, ascii).matches).toBe(true);
    expect(homoglyphSkeleton(lookalike)).toBe(ascii);
  });

  it("does not collapse unrelated Unicode characters", () => {
    expect(compareHomoglyphs("łodash", "lodash").matches).toBe(false);
  });
});
