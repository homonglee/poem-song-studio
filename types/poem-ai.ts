export type PoemAiRequest =
  | { operation: "generate" | "refine"; input: string }
  | { operation: "selection"; input: string; context: string };
