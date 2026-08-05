import { removeSeparators } from "../normalize.js";

export function hasSeparatorConfusion(left: string, right: string): boolean {
  return left !== right && removeSeparators(left) === removeSeparators(right);
}
