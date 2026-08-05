import { describe, expect, it } from "vitest";
import { runCli, type CliIo } from "../src/cli.js";

function captureIo(fileContents = ""): {
  io: CliIo;
  stdout: () => string;
  stderr: () => string;
} {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: (value) => {
        stdout += value;
      },
      stderr: (value) => {
        stderr += value;
      },
      readFile: async () => Promise.resolve(fileContents),
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

describe("runCli", () => {
  it("prints human-readable output", async () => {
    const capture = captureIo();
    const exitCode = await runCli(["lodahs", "--candidate", "lodash"], capture.io);
    expect(exitCode).toBe(1);
    expect(capture.stdout()).toContain("Score: 76/100");
    expect(capture.stdout()).toContain("Risk: high");
    expect(capture.stdout()).toContain("Closest match: lodash");
    expect(capture.stdout()).toContain("transpose adjacent characters");
    expect(capture.stderr()).toBe("");
  });

  it("prints valid undecorated JSON", async () => {
    const capture = captureIo();
    const exitCode = await runCli(
      ["lodahs", "--candidate", "lodash", "--format", "json"],
      capture.io,
    );
    const output = JSON.parse(capture.stdout()) as { score: number; closestMatch: string };
    expect(exitCode).toBe(1);
    expect(output).toMatchObject({ score: 76, closestMatch: "lodash" });
  });

  it("uses the alert threshold for exit codes", async () => {
    const below = captureIo();
    const reached = captureIo();
    expect(
      await runCli(["datefns", "--candidate", "date-fns", "--threshold", "33"], below.io),
    ).toBe(0);
    expect(
      await runCli(["datefns", "--candidate", "date-fns", "--threshold", "32"], reached.io),
    ).toBe(1);
  });

  it("loads candidates and popular packages from files", async () => {
    const capture = captureIo("# known packages\nlodash\nunderscore\n\n");
    const exitCode = await runCli(
      [
        "lodahs",
        "--candidates-file",
        "packages.txt",
        "--popular-packages-file",
        "popular.txt",
        "--format",
        "json",
      ],
      capture.io,
    );
    const output = JSON.parse(capture.stdout()) as { score: number };
    expect(exitCode).toBe(1);
    expect(output.score).toBe(92);
  });

  it.each([
    [["lodash"], "Provide at least one"],
    [["lodash", "--unknown"], "Unknown option"],
    [["lodash", "--candidate"], "requires a value"],
    [["lodash", "--candidate", "react", "--format", "xml"], "--format"],
    [["lodash", "--candidate", "react", "--threshold", "101"], "--threshold"],
  ] as const)("returns exit code 2 for invalid usage %#", async (args, expectedError) => {
    const capture = captureIo();
    expect(await runCli(args, capture.io)).toBe(2);
    expect(capture.stderr()).toContain(expectedError);
    expect(capture.stdout()).toBe("");
  });

  it("reports unreadable files on stderr", async () => {
    const capture = captureIo();
    capture.io.readFile = async () => Promise.reject(new Error("access denied"));
    expect(await runCli(["lodash", "--candidates-file", "missing.txt"], capture.io)).toBe(2);
    expect(capture.stderr()).toContain("Unable to read");
  });

  it("supports help and version without a package name", async () => {
    const help = captureIo();
    const version = captureIo();
    expect(await runCli(["--help"], help.io)).toBe(0);
    expect(help.stdout()).toContain("Usage: package-name-risk");
    expect(await runCli(["--version"], version.io)).toBe(0);
    expect(version.stdout()).toBe("0.1.0\n");
  });
});
