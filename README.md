# package-name-risk

A lightweight TypeScript library and CLI for detecting suspicious package-name similarity and common typosquatting patterns.

Package names can be hard to distinguish when characters are omitted, swapped, repeated, replaced with lookalike Unicode characters, or surrounded by plausible-sounding words. `package-name-risk` compares a proposed name with a caller-provided set of known names and returns a deterministic, serializable explanation. The analysis is local and performs no network requests.

## Installation

```bash
npm install package-name-risk
```

Node.js 20 or newer is required.

## Library API

```ts
import { analyzePackageName } from "package-name-risk";

const result = analyzePackageName("lodahs", {
  candidates: ["lodash", "underscore", "ramda"],
  popularPackages: ["lodash"],
});

console.log(result.score, result.risk, result.closestMatch);
// 92 "high" "lodash"
```

`analyzePackageName(packageName, options)` accepts:

- `candidates`: one or more known package names to compare.
- `popularPackages`: optional names whose suspicious similarities receive an additional 16 points.
- `threshold`: the minimum score included in `matches` (default `20`). It does not change the overall `score` or `closestMatch`.
- `maxMatches`: the maximum number of reported matches (default `5`, maximum `100`).

Clearly invalid input throws `PackageNameRiskError`. Package names are limited to 214 Unicode code points and may contain letters, combining marks, numbers, dots, underscores, and hyphens. Scoped names must have exactly the form `@scope/name`. Leading and trailing whitespace is normalized so accidental padding can be reported as an exact normalized match.

## CLI

Compare against one or more package names:

```bash
package-name-risk lodashs \
  --candidate lodash \
  --candidate underscore \
  --format text
```

Read newline-delimited names from files (blank lines and lines beginning with `#` are ignored):

```bash
package-name-risk lodashs \
  --candidates-file packages.txt \
  --popular-packages-file popular-packages.txt \
  --format json
```

Available options:

```text
--candidate <name>             Add a known package (repeatable)
--candidates-file <path>       Read known packages, one per line
--popular-package <name>       Mark a package as popular (repeatable)
--popular-packages-file <path> Read popular packages, one per line
--threshold <number>           Exit 1 at or above this score (default: 70)
--max-matches <number>         Limit reported matches (default: 5)
--format <text|json>           Select output format (default: text)
--help                         Show help
--version                      Show the version
```

The CLI exits with `0` below the alert threshold, `1` at or above it, and `2` for invalid usage or unreadable input. CLI `--threshold` is an alert threshold; the library option of the same name filters the `matches` array.

## Detection signals

- Exact match after trimming, NFC normalization, and case folding. Exact known names score zero because identity is different from suspicious similarity.
- Levenshtein edit distance, implemented with two rows of memory.
- One adjacent character transposition.
- One missing or extra character.
- An inserted repetition of a neighboring character.
- Hyphen, underscore, dot, or missing-separator confusion.
- Similar npm scopes when the package portion matches.
- An explicit set of common Cyrillic and Greek lookalikes for Latin `a`, `c`, `e`, `i`, `o`, `p`, `s`, `x`, and `y`.
- Generic prefix or suffix attachment: `official`, `secure`, `safe`, `helper`, `utils`, `plugin`, `packages`, or `js`.
- Additional weight for caller-designated popular packages.

## Scoring

Scores are deterministic integers from 0 to 100. The strongest signal supplies the base score. Independent signal families can add at most 12 corroboration points, preventing many weak or overlapping observations from stacking without bound. Similarity to a caller-designated popular package adds 16 points, but only when another suspicious signal exists. Signal `evidence.points` fields expose the weights used in the assessment.

|  Score | Risk   |
| -----: | ------ |
|   0–19 | none   |
|  20–44 | low    |
|  45–69 | medium |
| 70–100 | high   |

Exact normalized matches score `0`. A separator-only variation scores `32`, an adjacent transposition scores `76`, and a supported Unicode homoglyph match scores `88`. See [`src/scoring.ts`](src/scoring.ts) for all named weights and the combination rule.

A high score indicates naming similarity and potential confusion. It does not prove that a package is malicious.

## Example result

```json
{
  "packageName": "lodahs",
  "normalizedName": "lodahs",
  "risk": "high",
  "score": 92,
  "closestMatch": "lodash",
  "matches": [
    {
      "packageName": "lodash",
      "score": 92,
      "distance": 2,
      "signals": [
        {
          "type": "adjacent-transposition",
          "severity": "high",
          "message": "\"lodahs\" appears to transpose adjacent characters from \"lodash\".",
          "matchedPackage": "lodash",
          "evidence": { "points": 76 }
        }
      ]
    }
  ],
  "signals": [
    {
      "type": "adjacent-transposition",
      "severity": "high",
      "message": "\"lodahs\" appears to transpose adjacent characters from \"lodash\".",
      "matchedPackage": "lodash",
      "evidence": { "points": 76 }
    }
  ]
}
```

The abbreviated example omits additional signals that may appear in the actual result.

## CI usage

Fail a CI step when a proposed name reaches the default high-risk threshold:

```bash
npx package-name-risk "$PROPOSED_PACKAGE" \
  --candidates-file ./known-packages.txt \
  --popular-packages-file ./popular-packages.txt \
  --threshold 70 \
  --format json
```

For programmatic integration, use the returned `score` rather than interpreting message text.

## Limitations

The result measures naming similarity, not package contents, ownership, provenance, behavior, or malware. Candidate and popularity lists are supplied by the caller and are not fetched or updated by the library. The homoglyph map intentionally covers a small, auditable set rather than the full Unicode confusables standard. Language-specific pronunciation, keyboard-layout errors, phonetic similarity, and registry availability are outside the current scope. Generic attachments are heuristic and can describe legitimate packages.

Do not use this library as the sole basis for blocking a dependency or accusing a publisher. Review package provenance, maintainers, source, release history, and contents separately.

## Contributing

Issues and focused pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for local checks and contribution expectations. Security reports should follow [SECURITY.md](SECURITY.md).

## License

MIT © Çağrı Kaçmaz. See [LICENSE](LICENSE).
