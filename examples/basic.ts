import { analyzePackageName } from "package-name-risk";

const result = analyzePackageName("lodahs", {
  candidates: ["lodash", "underscore", "ramda"],
  popularPackages: ["lodash"],
});

console.log(result);
