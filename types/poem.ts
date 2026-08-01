export type PoemInputMode = "keyword" | "existing" | "ocr";

export interface PoemDraft {
  mode: PoemInputMode;
  source: string;
  content: string;
  updatedAt: string;
}

export interface SavePoemDraftInput {
  mode: PoemInputMode;
  source: string;
  content: string;
}

export interface PoemVersion extends PoemDraft {
  id: string;
  version: number;
  createdAt: string;
}
