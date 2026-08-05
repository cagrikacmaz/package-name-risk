import type { PackageNameRisk, PackageNameSignal, PackageNameSignalType } from "./types.js";

export const SIGNAL_POINTS = {
  adjacentTransposition: 76,
  missingCharacter: 68,
  extraCharacter: 68,
  repeatedCharacter: 72,
  separatorConfusion: 32,
  scopeConfusion: 62,
  unicodeHomoglyph: 88,
  prefixSuffixAttachment: 38,
  popularPackageBoost: 16,
} as const;

const SIGNAL_FAMILIES: Partial<Record<PackageNameSignalType, string>> = {
  "edit-distance": "character-edit",
  "adjacent-transposition": "character-edit",
  "missing-character": "character-edit",
  "extra-character": "character-edit",
  "repeated-character": "character-edit",
  "separator-confusion": "separator",
  "scope-confusion": "scope",
  "unicode-homoglyph": "unicode",
  "prefix-suffix-attachment": "attachment",
};

export function editDistancePoints(distance: number, longestLength: number): number {
  if (distance === 0 || longestLength === 0 || distance > 3) return 0;
  const similarity = 1 - distance / longestLength;
  if (similarity < 0.5) return 0;
  return Math.round(25 + similarity * 40);
}

export function scoreSignals(signals: readonly PackageNameSignal[]): number {
  if (signals.some((signal) => signal.type === "exact-normalized-match")) return 0;

  const familyScores = new Map<string, number>();
  for (const signal of signals) {
    const family = SIGNAL_FAMILIES[signal.type];
    const points = signal.evidence?.points;
    if (family && typeof points === "number") {
      familyScores.set(family, Math.max(familyScores.get(family) ?? 0, points));
    }
  }

  const ranked = [...familyScores.values()].sort((left, right) => right - left);
  const primary = ranked[0] ?? 0;
  // Independent weak signals provide limited corroboration; they cannot stack without bound.
  const corroboration = Math.min(
    12,
    Math.round(ranked.slice(1).reduce((sum, points) => sum + points * 0.2, 0)),
  );
  const popularBoost = signals.some((signal) => signal.type === "popular-package-similarity")
    ? SIGNAL_POINTS.popularPackageBoost
    : 0;

  return Math.min(100, primary + corroboration + popularBoost);
}

export function riskFromScore(score: number): PackageNameRisk {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  if (score >= 20) return "low";
  return "none";
}
