export type PoemLineChangeStatus = "unchanged" | "changed" | "added" | "removed";

export interface PoemLineComparison {
  left: string | null;
  right: string | null;
  status: PoemLineChangeStatus;
}

type EditOperation = "changed" | "added" | "removed";

const ALIGNMENT_WINDOW = 64;
const MAX_EXACT_ALIGNMENT_CELLS = 2_000_000;

function poemLines(content: string): string[] {
  return content === "" ? [] : content.split("\n");
}

function linePositions(lines: readonly string[]): Map<string, number[]> {
  const positions = new Map<string, number[]>();
  lines.forEach((line, index) => {
    const indexes = positions.get(line);
    if (indexes) indexes.push(index);
    else positions.set(line, [index]);
  });
  return positions;
}

function findNextPosition(positions: ReadonlyMap<string, readonly number[]>, value: string, start: number): number {
  const indexes = positions.get(value);
  if (!indexes) return -1;
  let low = 0;
  let high = indexes.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (indexes[middle] < start) low = middle + 1;
    else high = middle;
  }
  return indexes[low] ?? -1;
}

function localEditOperation(
  leftLines: readonly string[],
  rightLines: readonly string[],
  leftStart: number,
  rightStart: number,
): EditOperation {
  const leftLength = Math.min(ALIGNMENT_WINDOW, leftLines.length - leftStart);
  const rightLength = Math.min(ALIGNMENT_WINDOW, rightLines.length - rightStart);
  const costs = Array.from({ length: leftLength + 1 }, () => Array<number>(rightLength + 1).fill(0));

  for (let left = leftLength; left >= 0; left -= 1) costs[left][rightLength] = leftLength - left;
  for (let right = rightLength; right >= 0; right -= 1) costs[leftLength][right] = rightLength - right;
  for (let left = leftLength - 1; left >= 0; left -= 1) {
    for (let right = rightLength - 1; right >= 0; right -= 1) {
      if (leftLines[leftStart + left] === rightLines[rightStart + right]) {
        costs[left][right] = costs[left + 1][right + 1];
      } else {
        costs[left][right] = 1 + Math.min(costs[left + 1][right + 1], costs[left + 1][right], costs[left][right + 1]);
      }
    }
  }

  const changedCost = costs[1][1];
  const removedCost = costs[1][0];
  const addedCost = costs[0][1];
  const best = Math.min(changedCost, removedCost, addedCost);
  if (changedCost === best) return "changed";
  if (addedCost === best) return "added";
  return "removed";
}

function exactLineComparison(leftLines: readonly string[], rightLines: readonly string[]): PoemLineComparison[] {
  const columns = rightLines.length + 1;
  const costs = new Uint32Array((leftLines.length + 1) * columns);
  for (let left = leftLines.length; left >= 0; left -= 1) costs[left * columns + rightLines.length] = leftLines.length - left;
  for (let right = rightLines.length; right >= 0; right -= 1) costs[leftLines.length * columns + right] = rightLines.length - right;
  for (let left = leftLines.length - 1; left >= 0; left -= 1) {
    for (let right = rightLines.length - 1; right >= 0; right -= 1) {
      const cell = left * columns + right;
      if (leftLines[left] === rightLines[right]) {
        costs[cell] = costs[(left + 1) * columns + right + 1];
      } else {
        costs[cell] = 1 + Math.min(
          costs[(left + 1) * columns + right + 1],
          costs[(left + 1) * columns + right],
          costs[left * columns + right + 1],
        );
      }
    }
  }

  const comparison: PoemLineComparison[] = [];
  let left = 0;
  let right = 0;
  while (left < leftLines.length && right < rightLines.length) {
    if (leftLines[left] === rightLines[right]) {
      comparison.push({ left: leftLines[left], right: rightLines[right], status: "unchanged" });
      left += 1;
      right += 1;
      continue;
    }
    const changedCost = costs[(left + 1) * columns + right + 1];
    const removedCost = costs[(left + 1) * columns + right];
    const addedCost = costs[left * columns + right + 1];
    const best = Math.min(changedCost, removedCost, addedCost);
    if (changedCost === best) {
      comparison.push({ left: leftLines[left], right: rightLines[right], status: "changed" });
      left += 1;
      right += 1;
    } else if (addedCost === best) {
      comparison.push({ left: null, right: rightLines[right], status: "added" });
      right += 1;
    } else {
      comparison.push({ left: leftLines[left], right: null, status: "removed" });
      left += 1;
    }
  }
  while (left < leftLines.length) {
    comparison.push({ left: leftLines[left], right: null, status: "removed" });
    left += 1;
  }
  while (right < rightLines.length) {
    comparison.push({ left: null, right: rightLines[right], status: "added" });
    right += 1;
  }
  return comparison;
}

export function togglePoemVersionSelection(selectedIds: readonly string[], versionId: string): string[] {
  if (selectedIds.includes(versionId)) return selectedIds.filter((id) => id !== versionId);
  if (selectedIds.length >= 2) return [...selectedIds];
  return [...selectedIds, versionId];
}

export function comparePoemLines(leftContent: string, rightContent: string): PoemLineComparison[] {
  const leftLines = poemLines(leftContent);
  const rightLines = poemLines(rightContent);
  if ((leftLines.length + 1) * (rightLines.length + 1) <= MAX_EXACT_ALIGNMENT_CELLS) {
    return exactLineComparison(leftLines, rightLines);
  }
  const leftPositions = linePositions(leftLines);
  const rightPositions = linePositions(rightLines);
  const comparison: PoemLineComparison[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftLines.length && rightIndex < rightLines.length) {
    const left = leftLines[leftIndex];
    const right = rightLines[rightIndex];
    if (left === right) {
      comparison.push({ left, right, status: "unchanged" });
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    const rightMatch = findNextPosition(rightPositions, left, rightIndex + 1);
    const leftMatch = findNextPosition(leftPositions, right, leftIndex + 1);
    let operation: EditOperation;
    if (rightMatch === -1 && leftMatch === -1) {
      operation = "changed";
    } else if (rightMatch !== -1 && rightMatch - rightIndex >= ALIGNMENT_WINDOW && leftMatch === -1) {
      operation = "added";
    } else if (leftMatch !== -1 && leftMatch - leftIndex >= ALIGNMENT_WINDOW && rightMatch === -1) {
      operation = "removed";
    } else if (rightMatch !== -1 && leftMatch !== -1 && Math.min(rightMatch - rightIndex, leftMatch - leftIndex) >= ALIGNMENT_WINDOW) {
      operation = rightMatch - rightIndex <= leftMatch - leftIndex ? "added" : "removed";
    } else {
      operation = localEditOperation(leftLines, rightLines, leftIndex, rightIndex);
    }

    if (operation === "added") {
      comparison.push({ left: null, right, status: "added" });
      rightIndex += 1;
    } else if (operation === "removed") {
      comparison.push({ left, right: null, status: "removed" });
      leftIndex += 1;
    } else {
      comparison.push({ left, right, status: "changed" });
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  while (leftIndex < leftLines.length) {
    comparison.push({ left: leftLines[leftIndex], right: null, status: "removed" });
    leftIndex += 1;
  }
  while (rightIndex < rightLines.length) {
    comparison.push({ left: null, right: rightLines[rightIndex], status: "added" });
    rightIndex += 1;
  }

  return comparison;
}
