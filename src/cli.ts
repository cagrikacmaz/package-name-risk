import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { analyzePackageName } from "./analyze.js";
import { PackageNameRiskError } from "./errors.js";

const VERSION = "1.0.0";
const DEFAULT_ALERT_THRESHOLD = 70;

interface CliOptions {
  packageName?: string;
  candidates: string[];
  candidateFiles: string[];
  popularPackages: string[];
  popularPackageFiles: string[];
  alertThreshold: number;
  maxMatches: number;
  format: "text" | "json";
  help: boolean;
  version: boolean;
}

export interface CliIo {
  stdout: (value: string) => void;
  stderr: (value: string) => void;
  readFile: (path: string) => Promise<string>;
}

const defaultIo: CliIo = {
  stdout: (value) => process.stdout.write(value),
  stderr: (value) => process.stderr.write(value),
  readFile: async (path) => readFile(path, "utf8"),
};

export async function runCli(args: readonly string[], io: CliIo = defaultIo): Promise<number> {
  try {
    const options = parseArguments(args);
    if (options.help) {
      io.stdout(helpText());
      return 0;
    }
    if (options.version) {
      io.stdout(`${VERSION}\n`);
      return 0;
    }
    if (!options.packageName) throw new CliUsageError("A package name is required.");

    const candidates = [
      ...options.candidates,
      ...(await readNameFiles(options.candidateFiles, io)),
    ];
    const popularPackages = [
      ...options.popularPackages,
      ...(await readNameFiles(options.popularPackageFiles, io)),
    ];
    if (candidates.length === 0) {
      throw new CliUsageError("Provide at least one --candidate or --candidates-file.");
    }

    const result = analyzePackageName(options.packageName, {
      candidates,
      popularPackages,
      maxMatches: options.maxMatches,
    });
    io.stdout(
      options.format === "json" ? `${JSON.stringify(result, null, 2)}\n` : formatText(result),
    );
    return result.score >= options.alertThreshold ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`package-name-risk: ${message}\n`);
    return 2;
  }
}

function parseArguments(args: readonly string[]): CliOptions {
  const options: CliOptions = {
    candidates: [],
    candidateFiles: [],
    popularPackages: [],
    popularPackageFiles: [],
    alertThreshold: DEFAULT_ALERT_THRESHOLD,
    maxMatches: 5,
    format: "text",
    help: false,
    version: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--version" || argument === "-v") options.version = true;
    else if (argument === "--candidate")
      options.candidates.push(nextValue(args, ++index, argument));
    else if (argument === "--candidates-file")
      options.candidateFiles.push(nextValue(args, ++index, argument));
    else if (argument === "--popular-package")
      options.popularPackages.push(nextValue(args, ++index, argument));
    else if (argument === "--popular-packages-file")
      options.popularPackageFiles.push(nextValue(args, ++index, argument));
    else if (argument === "--threshold")
      options.alertThreshold = parseNumber(nextValue(args, ++index, argument), argument, 0, 100);
    else if (argument === "--max-matches")
      options.maxMatches = parseInteger(nextValue(args, ++index, argument), argument, 1, 100);
    else if (argument === "--format") {
      const format = nextValue(args, ++index, argument);
      if (format !== "text" && format !== "json") {
        throw new CliUsageError("--format must be either text or json.");
      }
      options.format = format;
    } else if (argument.startsWith("-")) {
      throw new CliUsageError(`Unknown option: ${argument}`);
    } else if (options.packageName) {
      throw new CliUsageError(`Unexpected argument: ${argument}`);
    } else {
      options.packageName = argument;
    }
  }

  return options;
}

function nextValue(args: readonly string[], index: number, option: string): string {
  const value = args[index];
  if (!value || value.startsWith("--")) throw new CliUsageError(`${option} requires a value.`);
  return value;
}

function parseNumber(value: string, option: string, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new CliUsageError(`${option} must be between ${String(minimum)} and ${String(maximum)}.`);
  }
  return parsed;
}

function parseInteger(value: string, option: string, minimum: number, maximum: number): number {
  const parsed = parseNumber(value, option, minimum, maximum);
  if (!Number.isInteger(parsed)) throw new CliUsageError(`${option} must be an integer.`);
  return parsed;
}

async function readNameFiles(paths: readonly string[], io: CliIo): Promise<string[]> {
  const names: string[] = [];
  for (const path of paths) {
    let content: string;
    try {
      content = await io.readFile(path);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new CliUsageError(`Unable to read "${path}": ${reason}`);
    }
    names.push(
      ...content
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#")),
    );
  }
  return names;
}

function formatText(result: ReturnType<typeof analyzePackageName>): string {
  const lines = [
    `Package: ${result.packageName}`,
    `Score: ${String(result.score)}/100`,
    `Risk: ${result.risk}`,
    `Closest match: ${result.closestMatch ?? "none"}`,
  ];

  if (result.signals.length === 0) {
    lines.push("Signals: none");
  } else {
    lines.push("Signals:");
    for (const detectedSignal of result.signals) {
      lines.push(`  - [${detectedSignal.severity}] ${detectedSignal.message}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function helpText(): string {
  return `Usage: package-name-risk <package-name> [options]

Options:
  --candidate <name>             Add a known package (repeatable)
  --candidates-file <path>       Read known packages, one per line
  --popular-package <name>       Mark a package as popular (repeatable)
  --popular-packages-file <path> Read popular packages, one per line
  --threshold <number>           Exit 1 at or above this score (default: 70)
  --max-matches <number>         Limit reported matches (default: 5)
  --format <text|json>           Select output format (default: text)
  --help                         Show this help
  --version                      Show the version
`;
}

class CliUsageError extends Error {}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  process.exitCode = await runCli(process.argv.slice(2));
}

export { PackageNameRiskError };
