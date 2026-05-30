export function appendBatchedLine(acc: string, line: string): string {
  return acc + line + "\n";
}

export function formatTerminalOutput(raw: string): string {
  const trimmed = raw.trimEnd();
  return trimmed.length > 0 ? trimmed : "(finished — no printed output)";
}
