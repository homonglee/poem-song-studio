export type PoemInputMode = "keyword" | "existing" | "ocr";

export interface PoemDraft {
  mode: PoemInputMode;
  source: string;
  title: string;
  author: string;
  content: string;
  originalTitle: string;
  originalContent: string;
  updatedAt: string;
}

export interface SavePoemDraftInput {
  mode: PoemInputMode;
  source: string;
  title?: string;
  author?: string;
  content: string;
  originalTitle?: string;
  originalContent?: string;
  initialVersionMemo?: string;
}

export interface PoemVersion extends PoemDraft {
  id: string;
  version: number;
  memo: string;
  createdAt: string;
}
