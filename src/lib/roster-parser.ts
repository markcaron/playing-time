export function parseRoster(text: string): { number: string; name: string }[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const results: { number: string; name: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^#|^number|^jersey/i.test(trimmed)) continue;

    const mdMatch = trimmed.match(/^(\d+)\.\s*(.+)/);
    if (mdMatch) {
      results.push({ number: mdMatch[1], name: mdMatch[2].trim() });
      continue;
    }

    const csvMatch = trimmed.match(/^(\d+)\s*,\s*(.+)/);
    if (csvMatch) {
      results.push({ number: csvMatch[1], name: csvMatch[2].trim() });
      continue;
    }

    if (trimmed.length > 0) {
      results.push({ number: '', name: trimmed });
    }
  }

  return results;
}
