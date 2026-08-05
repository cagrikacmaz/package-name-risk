import { PackageNameRiskError } from "./errors.js";
import { normalizePackageName } from "./normalize.js";

const MAX_PACKAGE_NAME_LENGTH = 214;
const VALID_PART = /^[\p{L}\p{M}\p{N}._-]+$/u;

export interface ParsedPackageName {
  normalized: string;
  scope?: string;
  name: string;
}

export function parsePackageName(value: unknown, label = "package name"): ParsedPackageName {
  if (typeof value !== "string") {
    throw new PackageNameRiskError("INVALID_PACKAGE_NAME", `${label} must be a string.`);
  }

  const normalized = normalizePackageName(value);
  if (normalized.length === 0) {
    throw new PackageNameRiskError("INVALID_PACKAGE_NAME", `${label} must not be empty.`);
  }
  if (Array.from(normalized).length > MAX_PACKAGE_NAME_LENGTH) {
    throw new PackageNameRiskError(
      "INVALID_PACKAGE_NAME",
      `${label} must not exceed ${MAX_PACKAGE_NAME_LENGTH} characters.`,
    );
  }
  if (/\s|[\u0000-\u001f\u007f]/u.test(normalized)) {
    throw new PackageNameRiskError("INVALID_PACKAGE_NAME", `${label} contains whitespace or control characters.`);
  }

  if (normalized.startsWith("@")) {
    const parts = normalized.slice(1).split("/");
    if (parts.length !== 2 || !isValidPart(parts[0]) || !isValidPart(parts[1])) {
      throw new PackageNameRiskError(
        "INVALID_PACKAGE_NAME",
        `${label} must use the scoped form "@scope/name".`,
      );
    }
    return { normalized, scope: parts[0], name: parts[1] };
  }

  if (normalized.includes("/") || !isValidPart(normalized)) {
    throw new PackageNameRiskError(
      "INVALID_PACKAGE_NAME",
      `${label} may contain letters, numbers, dots, underscores, and hyphens.`,
    );
  }

  return { normalized, name: normalized };
}

function isValidPart(value: string | undefined): value is string {
  return value !== undefined && VALID_PART.test(value);
}
