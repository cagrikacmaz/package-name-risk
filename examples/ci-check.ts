import { analyzePackageName } from "package-name-risk";

const proposedName = process.argv[2];
if (!proposedName) throw new Error("Pass a package name as the first argument.");

const result = analyzePackageName(proposedName, {
  candidates: ["lodash", "react", "express", "typescript"],
  popularPackages: ["lodash", "react", "express", "typescript"],
});

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.score >= 70 ? 1 : 0;
