import { describe, expect, it } from "vitest";
import { analyzePackageName } from "../src/analyze.js";
import { PackageNameRiskError } from "../src/errors.js";

function signalTypes(result: ReturnType<typeof analyzePackageName>): string[] {
  return result.signals.map((signal) => signal.type);
}

describe("analyzePackageName", () => {
  it("represents exact and normalized matches without treating them as suspicious", () => {
    const exact = analyzePackageName("lodash", { candidates: ["lodash"] });
    const normalized = analyzePackageName("  Lodash ", { candidates: ["lodash"] });

    for (const result of [exact, normalized]) {
      expect(result.score).toBe(0);
      expect(result.risk).toBe("none");
      expect(result.closestMatch).toBe("lodash");
      expect(signalTypes(result)).toContain("exact-normalized-match");
    }
  });

  it("detects adjacent transpositions and popular package similarity", () => {
    const result = analyzePackageName("lodahs", {
      candidates: ["lodash", "underscore", "ramda"],
      popularPackages: ["lodash"],
    });

    expect(result.score).toBe(92);
    expect(result.risk).toBe("high");
    expect(result.closestMatch).toBe("lodash");
    expect(signalTypes(result)).toEqual(
      expect.arrayContaining([
        "adjacent-transposition",
        "edit-distance",
        "popular-package-similarity",
      ]),
    );
  });

  it.each([
    ["lodsh", "missing-character"],
    ["lodasxh", "extra-character"],
    ["lodassh", "repeated-character"],
    ["reactt", "repeated-character"],
  ])("detects %s as %s", (proposed, expectedSignal) => {
    const candidate = proposed.startsWith("react") ? "react" : "lodash";
    expect(signalTypes(analyzePackageName(proposed, { candidates: [candidate] }))).toContain(
      expectedSignal,
    );
  });

  it.each([
    ["react_router", "react-router"],
    ["datefns", "date-fns"],
  ])("detects proportionate separator confusion for %s", (proposed, candidate) => {
    const result = analyzePackageName(proposed, { candidates: [candidate] });
    expect(signalTypes(result)).toContain("separator-confusion");
    expect(result.risk).toBe("low");
  });

  it("detects scoped-package confusion without crashing", () => {
    const typo = analyzePackageName("@cornpany/package", {
      candidates: ["@company/package"],
    });
    const attachment = analyzePackageName("@company-packages/package", {
      candidates: ["@company/package"],
    });

    expect(signalTypes(typo)).toContain("scope-confusion");
    expect(signalTypes(attachment)).toContain("scope-confusion");
  });

  it("detects supported Unicode homoglyphs with strong weight", () => {
    const result = analyzePackageName("lоdash", { candidates: ["lodash"] });
    expect(signalTypes(result)).toContain("unicode-homoglyph");
    expect(result.score).toBeGreaterThanOrEqual(88);
    expect(result.risk).toBe("high");
  });

  it.each(["lodash-secure", "official-lodash", "lodash-helper", "lodashjs"])(
    "detects generic attachment in %s",
    (proposed) => {
      const result = analyzePackageName(proposed, { candidates: ["lodash"] });
      expect(signalTypes(result)).toContain("prefix-suffix-attachment");
      expect(result.risk).toBe("low");
    },
  );

  it("weights popular packages more strongly", () => {
    const regular = analyzePackageName("lodahs", { candidates: ["lodash"] });
    const popular = analyzePackageName("lodahs", {
      candidates: ["lodash"],
      popularPackages: ["lodash"],
    });
    expect(popular.score - regular.score).toBe(16);
  });

  it("ranks candidates deterministically and removes normalized duplicates", () => {
    const result = analyzePackageName("experss", {
      candidates: ["ramda", "Express", "express", "expresso"],
      threshold: 0,
      maxMatches: 3,
    });
    expect(result.matches).toHaveLength(3);
    expect(result.matches[0]?.packageName).toBe("express");
    expect(result.matches.filter((match) => match.packageName === "express")).toHaveLength(1);
  });

  it("keeps the overall assessment when the reporting threshold filters matches", () => {
    const result = analyzePackageName("datefns", {
      candidates: ["date-fns"],
      threshold: 50,
    });
    expect(result.score).toBe(32);
    expect(result.matches).toEqual([]);
    expect(result.closestMatch).toBe("date-fns");
  });

  it("returns no risk for very different names", () => {
    const result = analyzePackageName("ramda", { candidates: ["typescript", "express"] });
    expect(result).toMatchObject({ score: 0, risk: "none", matches: [], signals: [] });
    expect(result.closestMatch).toBeUndefined();
  });

  it.each([
    ["", { candidates: ["lodash"] }],
    ["@scope", { candidates: ["lodash"] }],
    ["lodash", { candidates: [] }],
    ["lodash", { candidates: ["@broken"] }],
  ])("rejects invalid public input", (name, options) => {
    expect(() => analyzePackageName(name, options)).toThrowError(PackageNameRiskError);
  });

  it("validates numeric options", () => {
    expect(() => analyzePackageName("a", { candidates: ["b"], threshold: 101 })).toThrow(
      "threshold",
    );
    expect(() => analyzePackageName("a", { candidates: ["b"], maxMatches: 0 })).toThrow(
      "maxMatches",
    );
  });
});
