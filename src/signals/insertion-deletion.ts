export function isSingleCharacterRemoved(shorter: string, longer: string): boolean {
  const shortChars = Array.from(shorter);
  const longChars = Array.from(longer);
  if (longChars.length !== shortChars.length + 1) return false;

  let shortIndex = 0;
  let skipped = false;
  for (let longIndex = 0; longIndex < longChars.length; longIndex += 1) {
    if (shortChars[shortIndex] === longChars[longIndex]) {
      shortIndex += 1;
    } else if (skipped) {
      return false;
    } else {
      skipped = true;
    }
  }
  return true;
}

export function hasInsertedRepeatedCharacter(proposed: string, candidate: string): boolean {
  const proposedChars = Array.from(proposed);
  if (!isSingleCharacterRemoved(candidate, proposed)) return false;

  for (let index = 0; index < proposedChars.length; index += 1) {
    const withoutCharacter = proposedChars.toSpliced(index, 1).join("");
    const repeatsNeighbor =
      proposedChars[index] === proposedChars[index - 1] ||
      proposedChars[index] === proposedChars[index + 1];
    if (withoutCharacter === candidate && repeatsNeighbor) return true;
  }
  return false;
}
