export type PoemEditAction =
  | "spelling"
  | "lyrical"
  | "concise"
  | "deduplicate"
  | "metaphor"
  | "emotion"
  | "ending"
  | "line-breaks"
  | "selection"
  | "refine";

export const aiEditActions: { id: PoemEditAction; label: string }[] = [
  { id: "spelling", label: "맞춤법만 수정" },
  { id: "lyrical", label: "표현을 서정적으로 수정" },
  { id: "concise", label: "문장을 간결하게 수정" },
  { id: "deduplicate", label: "중복 표현 제거" },
  { id: "metaphor", label: "비유 강화" },
  { id: "emotion", label: "감정 강화" },
  { id: "ending", label: "결말 강화" },
  { id: "line-breaks", label: "행갈이 정리" },
  { id: "selection", label: "선택 영역만 수정" },
  { id: "refine", label: "전체 시 정제" },
];

function cleanLines(text: string): string {
  return text.split("\n").map((line) => line.trimEnd()).join("\n").replace(/\n{3,}/g, "\n\n");
}

function removeDuplicateLines(text: string): string {
  return text.split("\n").filter((line, index, lines) => index === 0 || line !== lines[index - 1]).join("\n");
}

export async function editPoemWithAi({ action, text }: { action: PoemEditAction; text: string }): Promise<string> {
  await Promise.resolve();
  const cleaned = cleanLines(text);
  switch (action) {
    case "spelling":
      return cleaned.replace(/[ \t]{2,}/g, " ");
    case "lyrical":
      return cleaned.replace(/빛/g, "은은한 빛");
    case "concise":
      return cleaned.replace(/[ \t]{2,}/g, " ").replace(/([.!?])\1+/g, "$1");
    case "deduplicate":
      return removeDuplicateLines(cleaned);
    case "metaphor":
      return `${cleaned}\n마치 새벽을 건너는 바람처럼`;
    case "emotion":
      return `${cleaned}\n마음 깊은 곳에서 오래 떨린다`;
    case "ending":
      return `${cleaned.replace(/\s+$/, "")}\n그리고 끝내, 우리는 빛으로 남는다`;
    case "line-breaks":
      return cleaned;
    case "selection":
      return `다듬은 구절: ${cleaned}`;
    case "refine":
      return removeDuplicateLines(cleaned.replace(/[ \t]{2,}/g, " "));
  }
}
