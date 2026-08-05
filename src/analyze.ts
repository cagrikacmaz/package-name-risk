import { PackageNameRiskError } from "./errors.js";
import { parsePackageName, type ParsedPackageName } from "./package-name.js";
import { editDistancePoints, riskFromScore, scoreSignals, SIGNAL_POINTS } from "./scoring.js";
import { levenshteinDistance } from "./signals/edit-distance.js";
import { compareHomoglyphs } from "./signals/homoglyph.js";
import {
  hasInsertedRepeatedCharacter,
  isSingleCharacterRemoved,
} from "./signals/insertion-deletion.js";
import { findGenericAttachment } from "./signals/prefix-suffix.js";
import { hasSeparatorConfusion } from "./signals/separator.js";
import { hasSingleAdjacentTransposition } from "./signals/transposition.js";
import type {
  AnalyzePackageNameOptions,
  PackageNameMatch,
  PackageNameRiskResult,
  PackageNameSignal,
  PackageNameSignalType,
} from "./types.js";

const DEFAULT_MATCH_THRESHOLD = 20;
const DEFAULT_MAX_MATCHES = 5;

export function analyzePackageName(
  packageName: string,
  options: AnalyzePackageNameOptions,
): PackageNameRiskResult {
  const proposed = parsePackageName(packageName);
  const { threshold, maxMatches } = validateOptions(options);
  const candidates = uniqueParsedNames(options.candidates, "candidate");
  const popularNames = new Set(
    uniqueParsedNames(options.popularPackages ?? [], "popular package").map(
      (candidate) => candidate.normalized,
    ),
  );

  const allMatches = candidates
    .map((candidate) => compareNames(proposed, candidate, popularNames.has(candidate.normalized)))
    .sort(compareMatches);
  const bestMatch = allMatches[0];
  const matches = allMatches
    .filter(
      (match) =>
        match.score >= threshold ||
        match.signals.some((signal) => signal.type === "exact-normalized-match"),
    )
    .slice(0, maxMatches);
  const score = bestMatch?.score ?? 0;

  return {
    packageName,
    normalizedName: proposed.normalized,
    risk: riskFromScore(score),
    score,
    ...(bestMatch && (bestMatch.score > 0 || hasExactSignal(bestMatch))
      ? { closestMatch: bestMatch.packageName }
      : {}),
    matches,
    signals: bestMatch?.signals ?? [],
  };
}

function compareNames(
  proposed: ParsedPackageName,
  candidate: ParsedPackageName,
  isPopular: boolean,
): PackageNameMatch {
  const distance = levenshteinDistance(proposed.normalized, candidate.normalized);
  const signals: PackageNameSignal[] = [];

  if (proposed.normalized === candidate.normalized) {
    signals.push(
      signal(
        "exact-normalized-match",
        "low",
        `The names are identical after trimming, Unicode normalization, and case folding.`,
        candidate.normalized,
        { points: 0 },
      ),
    );
  } else {
    addSuspiciousSignals(signals, proposed, candidate, distance);
    if (isPopular && signals.length > 0) {
      signals.push(
        signal(
          "popular-package-similarity",
          "high",
          `"${candidate.normalized}" is marked as a popular package, increasing the similarity risk.`,
          candidate.normalized,
          { points: SIGNAL_POINTS.popularPackageBoost },
        ),
      );
    }
  }

  return {
    packageName: candidate.normalized,
    score: scoreSignals(signals),
    distance,
    signals,
  };
}

function addSuspiciousSignals(
  signals: PackageNameSignal[],
  proposed: ParsedPackageName,
  candidate: ParsedPackageName,
  distance: number,
): void {
  const proposedName = proposed.normalized;
  const candidateName = candidate.normalized;
  const separatorConfusion = hasSeparatorConfusion(proposedName, candidateName);
  const homoglyphs = compareHomoglyphs(proposedName, candidateName);

  if (homoglyphs.matches) {
    signals.push(
      signal(
        "unicode-homoglyph",
        "high",
        `"${proposedName}" uses Unicode characters that resemble "${candidateName}".`,
        candidateName,
        {
          points: SIGNAL_POINTS.unicodeHomoglyph,
          substitutions: homoglyphs.substitutions,
          skeleton: homoglyphs.skeleton,
        },
      ),
    );
  }

  if (!separatorConfusion && hasSingleAdjacentTransposition(proposedName, candidateName)) {
    signals.push(
      signal(
        "adjacent-transposition",
        "high",
        `"${proposedName}" appears to transpose adjacent characters from "${candidateName}".`,
        candidateName,
        { points: SIGNAL_POINTS.adjacentTransposition },
      ),
    );
  }

  if (!separatorConfusion && isSingleCharacterRemoved(proposedName, candidateName)) {
    signals.push(
      signal(
        "missing-character",
        "medium",
        `"${proposedName}" is one character shorter than "${candidateName}".`,
        candidateName,
        { points: SIGNAL_POINTS.missingCharacter },
      ),
    );
  }

  if (!separatorConfusion && isSingleCharacterRemoved(candidateName, proposedName)) {
    signals.push(
      signal(
        "extra-character",
        "medium",
        `"${proposedName}" contains one extra character compared with "${candidateName}".`,
        candidateName,
        { points: SIGNAL_POINTS.extraCharacter },
      ),
    );
  }

  if (!separatorConfusion && hasInsertedRepeatedCharacter(proposedName, candidateName)) {
    signals.push(
      signal(
        "repeated-character",
        "high",
        `"${proposedName}" repeats a character from "${candidateName}".`,
        candidateName,
        { points: SIGNAL_POINTS.repeatedCharacter },
      ),
    );
  }

  if (separatorConfusion) {
    signals.push(
      signal(
        "separator-confusion",
        "low",
        `"${proposedName}" differs from "${candidateName}" only by separators.`,
        candidateName,
        { points: SIGNAL_POINTS.separatorConfusion },
      ),
    );
  }

  addScopeSignal(signals, proposed, candidate);
  const attachmentFound = addAttachmentSignal(signals, proposed, candidate);

  if (!separatorConfusion && !attachmentFound) {
    const points = editDistancePoints(
      distance,
      Math.max(Array.from(proposedName).length, Array.from(candidateName).length),
    );
    if (points > 0) {
      signals.push(
        signal(
          "edit-distance",
          points >= 55 ? "medium" : "low",
          `"${proposedName}" is ${String(distance)} edit${distance === 1 ? "" : "s"} from "${candidateName}".`,
          candidateName,
          {
            points,
            distance,
            similarity: Number(
              (1 - distance / Math.max(proposedName.length, candidateName.length)).toFixed(3),
            ),
          },
        ),
      );
    }
  }
}

function addScopeSignal(
  signals: PackageNameSignal[],
  proposed: ParsedPackageName,
  candidate: ParsedPackageName,
): void {
  if (!proposed.scope || !candidate.scope || proposed.name !== candidate.name) return;

  const scopeDistance = levenshteinDistance(proposed.scope, candidate.scope);
  const similarScope =
    scopeDistance <= 2 ||
    compareHomoglyphs(proposed.scope, candidate.scope).matches ||
    hasSeparatorConfusion(proposed.scope, candidate.scope) ||
    findGenericAttachment(proposed.scope, candidate.scope) !== undefined;
  if (!similarScope) return;

  signals.push(
    signal(
      "scope-confusion",
      "medium",
      `The package portion matches, while scope "${proposed.scope}" resembles "${candidate.scope}".`,
      candidate.normalized,
      { points: SIGNAL_POINTS.scopeConfusion, scopeDistance },
    ),
  );
}

function addAttachmentSignal(
  signals: PackageNameSignal[],
  proposed: ParsedPackageName,
  candidate: ParsedPackageName,
): boolean {
  if (proposed.scope !== candidate.scope) return false;
  const attachment = findGenericAttachment(proposed.name, candidate.name);
  if (!attachment) return false;

  signals.push(
    signal(
      "prefix-suffix-attachment",
      "low",
      `"${proposed.normalized}" adds the generic ${attachment.position} "${attachment.word}" to "${candidate.normalized}".`,
      candidate.normalized,
      {
        points: SIGNAL_POINTS.prefixSuffixAttachment,
        attachment: attachment.word,
        position: attachment.position,
      },
    ),
  );
  return true;
}

function signal(
  type: PackageNameSignalType,
  severity: PackageNameSignal["severity"],
  message: string,
  matchedPackage: string,
  evidence: NonNullable<PackageNameSignal["evidence"]>,
): PackageNameSignal {
  return { type, severity, message, matchedPackage, evidence };
}

function uniqueParsedNames(values: readonly string[], label: string): ParsedPackageName[] {
  const seen = new Set<string>();
  const parsed: ParsedPackageName[] = [];
  for (const [index, value] of values.entries()) {
    const name = parsePackageName(value, `${label} at index ${String(index)}`);
    if (!seen.has(name.normalized)) {
      seen.add(name.normalized);
      parsed.push(name);
    }
  }
  return parsed;
}

function validateOptions(options: AnalyzePackageNameOptions | undefined): {
  threshold: number;
  maxMatches: number;
} {
  if (!options || !Array.isArray(options.candidates) || options.candidates.length === 0) {
    throw new PackageNameRiskError(
      "INVALID_CANDIDATES",
      "options.candidates must contain at least one package name.",
    );
  }
  if (options.popularPackages !== undefined && !Array.isArray(options.popularPackages)) {
    throw new PackageNameRiskError("INVALID_OPTION", "popularPackages must be an array.");
  }

  const threshold = options.threshold ?? DEFAULT_MATCH_THRESHOLD;
  const maxMatches = options.maxMatches ?? DEFAULT_MAX_MATCHES;
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    throw new PackageNameRiskError("INVALID_OPTION", "threshold must be between 0 and 100.");
  }
  if (!Number.isInteger(maxMatches) || maxMatches < 1 || maxMatches > 100) {
    throw new PackageNameRiskError(
      "INVALID_OPTION",
      "maxMatches must be an integer between 1 and 100.",
    );
  }
  return { threshold, maxMatches };
}

function compareMatches(left: PackageNameMatch, right: PackageNameMatch): number {
  return (
    right.score - left.score ||
    left.distance - right.distance ||
    left.packageName.localeCompare(right.packageName, "en")
  );
}

function hasExactSignal(match: PackageNameMatch): boolean {
  return match.signals.some((signal) => signal.type === "exact-normalized-match");
}
