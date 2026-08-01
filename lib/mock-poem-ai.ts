export interface MockPoemRequest {
  mode: "keyword";
  input: string;
}

export async function generateMockPoem({ input }: MockPoemRequest): Promise<string> {
  await Promise.resolve();
  const subject = input.trim();
  return `${subject}\n\n${subject}이 조용히 문을 열면\n작은 빛이 하루를 건너고\n마음은 오래 그 자리에 머문다`;
}
