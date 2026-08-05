# Contributing

Thank you for considering a contribution. Keep changes focused on package-name analysis, its command-line interface, or directly supporting documentation and tooling.

## Development

Use Node.js 20 or newer and npm:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

Run `npm run format` before submitting a pull request. Add explicit tests for behavioral changes; avoid snapshots when direct assertions describe the contract more clearly.

## Design expectations

- Keep core analysis deterministic and free of network access.
- Avoid runtime dependencies unless their value outweighs the audit and maintenance cost.
- Make new scoring weights explicit in `src/scoring.ts` and explain non-obvious tradeoffs.
- Treat scores as similarity indicators, never malware verdicts.
- Document new normalization or homoglyph behavior because it can change false-positive rates.

Open an issue before proposing a broad API or scoring-model change. By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
