export type PackageNameRiskErrorCode =
  "INVALID_PACKAGE_NAME" | "INVALID_CANDIDATES" | "INVALID_OPTION";

export class PackageNameRiskError extends Error {
  readonly code: PackageNameRiskErrorCode;

  constructor(code: PackageNameRiskErrorCode, message: string) {
    super(message);
    this.name = "PackageNameRiskError";
    this.code = code;
  }
}
