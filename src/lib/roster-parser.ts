export interface RosterMeta {
  name?: string;
  format?: string;
  halfLength?: number;
}

export interface ParsedRoster {
  meta: RosterMeta;
  players: { number: string; name: string }[];
}

export function parseRoster(text: string): { number: string; name: string }[] {
  return parseRosterWithMeta(text).players;
}

export function parseRosterWithMeta(text: string): ParsedRoster {
  const lines = text.trim().split('\n');
  const meta: RosterMeta = {};
  const players: { number: string; name: string }[] = [];

  let inFrontmatter = false;
  let frontmatterDone = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (trimmed === '---' && !frontmatterDone) {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else {
        inFrontmatter = false;
        frontmatterDone = true;
        continue;
      }
    }

    if (inFrontmatter) {
      const kvMatch = trimmed.match(/^(\w+)\s*:\s*(.+)/);
      if (kvMatch) {
        const key = kvMatch[1].toLowerCase();
        const val = kvMatch[2].trim();
        if (key === 'name') meta.name = val;
        else if (key === 'format') meta.format = val;
        else if (key === 'halflength') meta.halfLength = parseInt(val, 10);
      }
      continue;
    }

    if (/^#\s*(\w+)\s*:\s*(.+)/.test(trimmed)) {
      const commentMeta = trimmed.match(/^#\s*(\w+)\s*:\s*(.+)/);
      if (commentMeta) {
        const key = commentMeta[1].toLowerCase();
        const val = commentMeta[2].trim();
        if (key === 'name') meta.name = val;
        else if (key === 'format') meta.format = val;
        else if (key === 'halflength') meta.halfLength = parseInt(val, 10);
      }
      continue;
    }

    if (/^#|^number|^jersey/i.test(trimmed)) continue;

    const mdMatch = trimmed.match(/^(\d+)\.\s*(.+)/);
    if (mdMatch) {
      players.push({ number: mdMatch[1], name: mdMatch[2].trim() });
      continue;
    }

    const csvMatch = trimmed.match(/^(\d*)\s*,\s*(.+)/);
    if (csvMatch) {
      players.push({ number: csvMatch[1].trim(), name: csvMatch[2].trim() });
      continue;
    }

    if (trimmed.length > 0) {
      players.push({ number: '', name: trimmed });
    }
  }

  return { meta, players };
}
