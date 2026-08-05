import { removeSeparators } from "../normalize.js";

const GENERIC_ATTACHMENTS = [
  "official",
  "secure",
  "safe",
  "helper",
  "utils",
  "plugin",
  "packages",
  "js",
];

export interface AttachmentMatch {
  word: string;
  position: "prefix" | "suffix";
}

export function findGenericAttachment(
  proposed: string,
  candidate: string,
): AttachmentMatch | undefined {
  const compactProposed = removeSeparators(proposed);
  const compactCandidate = removeSeparators(candidate);

  for (const word of GENERIC_ATTACHMENTS) {
    if (compactProposed === `${word}${compactCandidate}`) return { word, position: "prefix" };
    if (compactProposed === `${compactCandidate}${word}`) return { word, position: "suffix" };
  }
  return undefined;
}
