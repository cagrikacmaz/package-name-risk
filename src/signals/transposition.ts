export function hasSingleAdjacentTransposition(left: string, right: string): boolean {
  const leftChars = Array.from(left);
  const rightChars = Array.from(right);
  if (leftChars.length !== rightChars.length) return false;

  const differences: number[] = [];
  for (let index = 0; index < leftChars.length; index += 1) {
    if (leftChars[index] !== rightChars[index]) differences.push(index);
  }

  return (
    differences.length === 2 &&
    differences[1] === differences[0]! + 1 &&
    leftChars[differences[0]!] === rightChars[differences[1]!] &&
    leftChars[differences[1]!] === rightChars[differences[0]!]
  );
}
