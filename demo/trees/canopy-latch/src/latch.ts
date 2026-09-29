export function keepLast(line: string, previous: string): string {
  const trimmed = line.trim();
  return trimmed.length > 0 ? trimmed : previous;
}
