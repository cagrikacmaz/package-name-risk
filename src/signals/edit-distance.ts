export function levenshteinDistance(left: string, right: string): number {
  const source = Array.from(left);
  const target = Array.from(right);

  if (source.length > target.length) {
    return levenshteinDistance(right, left);
  }
  if (source.length === 0) {
    return target.length;
  }

  let previous = Array.from({ length: source.length + 1 }, (_, index) => index);
  let current = new Array<number>(source.length + 1);

  for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
    current[0] = targetIndex;
    for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
      const substitution =
        previous[sourceIndex - 1]! + (source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1);
      current[sourceIndex] = Math.min(
        previous[sourceIndex]! + 1,
        current[sourceIndex - 1]! + 1,
        substitution,
      );
    }
    [previous, current] = [current, previous];
  }

  return previous[source.length]!;
}
