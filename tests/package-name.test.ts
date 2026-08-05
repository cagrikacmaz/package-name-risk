import { describe, expect, it } from "vitest";
import { PackageNameRiskError } from "../src/errors.js";
import { normalizePackageName } from "../src/normalize.js";
import { parsePackageName } from "../src/package-name.js";

describe("normalizePackageName", () => {
  it("trims, lowercases, and normalizes Unicode", () => {
    expect(normalizePackageName("  Lodash  ")).toBe("lodash");
    expect(normalizePackageName("E\u0301cho")).toBe("écho");
  });
});

describe("parsePackageName", () => {
  it("parses unscoped and scoped package names", () => {
    expect(parsePackageName("React-Router")).toEqual({
      normalized: "react-router",
      name: "react-router",
    });
    expect(parsePackageName("@Company/Package")).toEqual({
      normalized: "@company/package",
      scope: "company",
      name: "package",
    });
  });

  it.each(["", "   ", "@scope", "@/name", "@scope/", "@scope/name/extra", "has space"])(
    "rejects invalid input %j",
    (value) => {
      expect(() => parsePackageName(value)).toThrowError(PackageNameRiskError);
    },
  );

  it("rejects non-strings and very long names", () => {
    expect(() => parsePackageName(undefined)).toThrow("must be a string");
    expect(() => parsePackageName("a".repeat(215))).toThrow("214");
  });

  it("accepts Unicode letters for homoglyph analysis", () => {
    expect(parsePackageName("lоdash").normalized).toBe("lоdash");
  });
});
