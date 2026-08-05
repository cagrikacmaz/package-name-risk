export type PackageNameRisk = "none" | "low" | "medium" | "high";

export type PackageNameSignalType =
  | "exact-normalized-match"
  | "edit-distance"
  | "adjacent-transposition"
  | "missing-character"
  | "extra-character"
  | "repeated-character"
  | "separator-confusion"
  | "scope-confusion"
  | "unicode-homoglyph"
  | "prefix-suffix-attachment"
  | "popular-package-similarity";

export interface AnalyzePackageNameOptions {
  candidates: readonly string[];
  popularPackages?: readonly string[];
  /** Lowest-scoring match included in `matches`. Does not change the overall score. */
  minimumMatchScore?: number;
  maxMatches?: number;
}

export interface PackageNameSignal {
  type: PackageNameSignalType;
  severity: "low" | "medium" | "high";
  message: string;
  matchedPackage?: string;
  evidence?: Record<string, string | number | boolean>;
}

export interface PackageNameMatch {
  packageName: string;
  score: number;
  distance: number;
  signals: PackageNameSignal[];
}

export interface PackageNameRiskResult {
  packageName: string;
  normalizedName: string;
  risk: PackageNameRisk;
  score: number;
  closestMatch?: string;
  matches: PackageNameMatch[];
  signals: PackageNameSignal[];
}
