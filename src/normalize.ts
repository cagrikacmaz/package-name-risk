export function normalizePackageName(value: string): string {
  return value.trim().normalize("NFC").toLocaleLowerCase("en-US");
}

export function removeSeparators(value: string): string {
  return value.replace(/[._-]/g, "");
}
