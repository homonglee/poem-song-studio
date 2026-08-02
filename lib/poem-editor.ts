export interface PoemStats {
  characters: number;
  lines: number;
  stanzas: number;
}

export interface EditorDocument {
  title: string;
  content: string;
}

export interface EditorHistory {
  past: EditorDocument[];
  present: EditorDocument;
  future: EditorDocument[];
}

export function createEditorHistory(document: EditorDocument): EditorHistory {
  return { past: [], present: document, future: [] };
}

export function applyEditorChange(history: EditorHistory, document: EditorDocument): EditorHistory {
  if (history.present.title === document.title && history.present.content === document.content) return history;
  return { past: [...history.past.slice(-99), history.present], present: document, future: [] };
}

export function undoEditorChange(history: EditorHistory): EditorHistory {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
}

export function redoEditorChange(history: EditorHistory): EditorHistory {
  const next = history.future[0];
  if (!next) return history;
  return { past: [...history.past, history.present], present: next, future: history.future.slice(1) };
}

export function insertAtSelection(content: string, start: number, end: number, insertion: string) {
  return {
    content: `${content.slice(0, start)}${insertion}${content.slice(end)}`,
    caret: start + insertion.length,
  };
}

export function deleteLineAt(content: string, position: number) {
  const start = content.lastIndexOf("\n", Math.max(0, position - 1)) + 1;
  const end = content.indexOf("\n", position);
  if (end >= 0) return { content: content.slice(0, start) + content.slice(end + 1), caret: start };
  if (start > 0) return { content: content.slice(0, start - 1), caret: start - 1 };
  return { content: "", caret: 0 };
}

export function findMatches(content: string, query: string): number[] {
  if (!query) return [];
  const matches: number[] = [];
  let cursor = 0;
  while (cursor <= content.length - query.length) {
    const index = content.indexOf(query, cursor);
    if (index < 0) break;
    matches.push(index);
    cursor = index + query.length;
  }
  return matches;
}

export function replaceAllText(content: string, query: string, replacement: string) {
  const count = findMatches(content, query).length;
  return { content: count ? content.split(query).join(replacement) : content, count };
}

export function getPoemStats(content: string): PoemStats {
  return {
    characters: content.length,
    lines: content ? content.split("\n").length : 0,
    stanzas: content.trim() ? content.trim().split(/\n\s*\n/).length : 0,
  };
}
