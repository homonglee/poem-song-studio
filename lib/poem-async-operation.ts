export function isPoemAsyncOperationActive(
  operationEpoch: number | null,
  editorEpoch: number,
): boolean {
  return operationEpoch !== null && operationEpoch === editorEpoch;
}
