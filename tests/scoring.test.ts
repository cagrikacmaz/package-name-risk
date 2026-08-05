import { describe, expect, it } from "vitest";
import { editDistancePoints, riskFromScore, scoreSignals } from "../src/scoring.js";
import type { PackageNameSignal } from "../src/types.js";

function scoredSignal(type: PackageNameSignal["type"], points: number): PackageNameSignal {
  return { type, severity: "low", message: "test", evidence: { points } };
}

describe("scoring", () => {
  it("maps documented score bands", () => {
    expect([0, 19].map(riskFromScore)).toEqual(["none", "none"]);
    expect([20, 44].map(riskFromScore)).toEqual(["low", "low"]);
    expect([45, 69].map(riskFromScore)).toEqual(["medium", "medium"]);
    expect([70, 100].map(riskFromScore)).toEqual(["high", "high"]);
  });

  it("bounds corroboration from independent signals", () => {
    const signals = [
      scoredSignal("separator-confusion", 32),
      scoredSignal("prefix-suffix-attachment", 38),
      scoredSignal("scope-confusion", 62),
    ];
    expect(scoreSignals(signals)).toBe(74);
  });

  it("does not double-count related character-edit signals", () => {
    const signals = [scoredSignal("edit-distance", 55), scoredSignal("adjacent-transposition", 76)];
    expect(scoreSignals(signals)).toBe(76);
  });

  it("scores exact matches as zero and rejects distant edits", () => {
    expect(scoreSignals([scoredSignal("exact-normalized-match", 0)])).toBe(0);
    expect(editDistancePoints(4, 6)).toBe(0);
  });
});
