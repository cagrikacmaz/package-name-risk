const HOMOGLYPHS: Readonly<Record<string, string>> = {
  // Cyrillic
  а: "a",
  с: "c",
  е: "e",
  і: "i",
  о: "o",
  р: "p",
  ѕ: "s",
  х: "x",
  у: "y",
  // Greek
  α: "a",
  ϲ: "c",
  ε: "e",
  ι: "i",
  ο: "o",
  ρ: "p",
  ѕ: "s",
  χ: "x",
  γ: "y",
};

export interface HomoglyphComparison {
  matches: boolean;
  substitutions: number;
  skeleton: string;
}

export function homoglyphSkeleton(value: string): string {
  return Array.from(value, (character) => HOMOGLYPHS[character] ?? character).join("");
}

export function compareHomoglyphs(left: string, right: string): HomoglyphComparison {
  const skeleton = homoglyphSkeleton(left);
  const substitutions = Array.from(left).filter((character) => character in HOMOGLYPHS).length;
  return {
    matches: left !== right && substitutions > 0 && skeleton === homoglyphSkeleton(right),
    substitutions,
    skeleton,
  };
}
