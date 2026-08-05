import { describe, expect, it } from "vitest";
import { levenshteinDistance } from "../src/signals/edit-distance.js";

describe("levenshteinDistance", () => {
  it.each([
    ["", "", 0],
    ["", "abc", 3],
    ["abc", "", 3],
    ["lodash", "lodsh", 1],
    ["kitten", "sitting", 3],
    ["same", "same", 0],
    ["😀a", "😀b", 1],
  ])("returns the distance between %j and %j", (left, right, expected) => {
    expect(levenshteinDistance(left, right)).toBe(expected);
  });

  it("is symmetric", () => {
    expect(levenshteinDistance("a-longer-name", "short")).toBe(
      levenshteinDistance("short", "a-longer-name"),
    );
  });
});
