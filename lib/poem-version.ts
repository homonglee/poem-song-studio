export function currentPoemVersionNumber(versions: ReadonlyArray<{ version: number }>): number | null {
  return versions.reduce<number | null>((current, item) => current === null ? item.version : Math.max(current, item.version), null);
}

export function findPoemVersionById<T extends { id: string }>(versions: ReadonlyArray<T>, id: string | null): T | null {
  if (!id) return null;
  return versions.find((version) => version.id === id) ?? null;
}

export function formatPoemVersion(version: number): string {
  return `v${String(version).padStart(2, "0")}`;
}

export function memoAfterVersionSave(currentMemo: string, savedMemo: string): string {
  return currentMemo === savedMemo ? "" : currentMemo;
}

export function shouldCreateAdditionalVersion(versionCountBeforeSave: number, versionCountAfterSave: number): boolean {
  return versionCountAfterSave <= versionCountBeforeSave;
}
