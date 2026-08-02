export interface PoemSelectionSnapshot {
  content: string;
  start: number;
  end: number;
}

export function isPoemSelectionSnapshotCurrent(
  snapshot: PoemSelectionSnapshot,
  current: PoemSelectionSnapshot,
): boolean {
  return snapshot.content === current.content
    && snapshot.start === current.start
    && snapshot.end === current.end;
}
