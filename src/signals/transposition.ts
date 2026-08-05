export function hasSingleAdjacentTransposition(left: string, right: string): boolean {
  const leftChars = Array.from(left);
  const rightChars = Array.from(right);
  if (leftChars.length !== rightChars.length) return false;

  const differences: number[] = [];
  for (let index = 0; index < leftChars.length; index += 1) {
    if (leftChars[index] !== rightChars[index]) differences.push(index);
  }

  if (differences.length !== 2) return false;
  const first = differences[0];
  const second = differences[1];
  if (first === undefined || second === undefined) return false;

  return (
    second === first + 1 &&
    leftChars[first] === rightChars[second] &&
    leftChars[second] === rightChars[first]
  );
}
