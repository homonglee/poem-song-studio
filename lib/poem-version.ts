export function formatPoemVersion(version: number): string {
  return `v${String(version).padStart(2, "0")}`;
}

export function shouldCreateAdditionalVersion(versionCountBeforeSave: number, versionCountAfterSave: number): boolean {
  return versionCountAfterSave <= versionCountBeforeSave;
}
