import { POSITIONS } from './types.js';

const VALID_POSITIONS = new Set<string>(POSITIONS);

export interface RosterMeta {
  name?: string;
  format?: string;
  halfLength?: number;
  formation?: string;
}

export interface ParsedPlayer {
  number: string;
  name: string;
  nickname?: string;
  primaryPos?: string;
  secondaryPos?: string;
}

export interface ParsedRoster {
  meta: RosterMeta;
  players: ParsedPlayer[];
}

/* ── YAML value helpers ────────────────────────────────────── */

function yamlQuote(val: string): string {
  if (/[:#"'\[\]{}|>&*!?@`\n\r]/.test(val) || val !== val.trim()) {
    return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`;
  }
  return val;
}

function yamlUnquote(val: string): string {
  if (val.length >= 2 && val.startsWith('"') && val.endsWith('"')) {
    return val.slice(1, -1).replace(
      /\\(.)/g,
      (_, c) => c === 'n' ? '\n' : c === 'r' ? '\r' : c === 't' ? '\t' : c,
    );
  }
  if (val.length >= 2 && val.startsWith("'") && val.endsWith("'")) {
    return val.slice(1, -1);
  }
  return val;
}

/* ── YAML export ───────────────────────────────────────────── *
 *
 * Produces a YAML-like format that is NOT standard YAML. Player
 * entries use `  - NUMBER. Name` (the markdown numbered-list style)
 * followed by indented key-value pairs for optional fields:
 *
 *   name: USWNT
 *   format: 11v11
 *   players:
 *     - 10. Rose Lavelle
 *       nickname: Rosie
 *       primaryPos: CM
 *
 * A standard YAML parser would treat `10. Rose Lavelle` as a plain
 * scalar string. Do not use a YAML library to parse this output —
 * use parseRosterWithMeta() which handles both this format and the
 * standard YAML key-value style (- number: "10" / name: ...).
 *
 * Detection: parseRosterWithMeta auto-detects this format when the
 * input has a standalone `players:` line and does NOT start with
 * `---` (frontmatter). Frontmatter-fenced files are parsed as the
 * legacy markdown format for backward compatibility.
 * ─────────────────────────────────────────────────────────── */

export function serializeRosterYaml(
  meta: RosterMeta,
  players: Array<{
    number?: string;
    name: string;
    nickname?: string;
    primaryPos?: string;
    secondaryPos?: string;
  }>,
): string {
  const lines: string[] = [];

  if (meta.name) lines.push(`name: ${yamlQuote(meta.name)}`);
  if (meta.format) lines.push(`format: ${yamlQuote(meta.format)}`);
  if (meta.halfLength != null) lines.push(`halfLength: ${meta.halfLength}`);
  if (meta.formation) lines.push(`formation: ${yamlQuote(meta.formation)}`);

  lines.push('players:');

  for (const p of players) {
    const num = p.number ?? '';
    const nameStr = yamlQuote(p.name);
    lines.push(num ? `  - ${num}. ${nameStr}` : `  - ${nameStr}`);
    if (p.nickname) lines.push(`    nickname: ${yamlQuote(p.nickname)}`);
    if (p.primaryPos) lines.push(`    primaryPos: ${p.primaryPos}`);
    if (p.secondaryPos) lines.push(`    secondaryPos: ${p.secondaryPos}`);
  }

  return lines.join('\n');
}

/* ── Public API ─────────────────────────────────────────────── */

export function parseRoster(text: string): ParsedPlayer[] {
  return parseRosterWithMeta(text).players;
}

export function parseRosterWithMeta(text: string): ParsedRoster {
  const trimmed = text.trim();
  if (isYamlFormat(trimmed)) return parseYaml(trimmed);
  if (isCsvWithHeader(trimmed)) return parseCsvWithHeader(trimmed);
  return parseMarkdownOrLegacy(trimmed);
}

/* ── Format detection ──────────────────────────────────────── */

/** Standalone `players:` key (no value), and NOT inside frontmatter fences. */
function isYamlFormat(text: string): boolean {
  if (text.startsWith('---')) return false;
  return /^players:\s*$/m.test(text);
}

/** First non-empty line has comma-separated columns including `number` and `name`. */
function isCsvWithHeader(text: string): boolean {
  const firstLine = text.split('\n')[0].trim().toLowerCase();
  const cols = firstLine.split(',').map(c => c.trim());
  return cols.includes('number') && cols.includes('name');
}

/* ── YAML parser ───────────────────────────────────────────── */

function parseYaml(text: string): ParsedRoster {
  const lines = text.split('\n');
  const meta: RosterMeta = {};
  const players: ParsedPlayer[] = [];
  let inPlayers = false;
  let current: ParsedPlayer | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (trimmed === 'players:') {
      inPlayers = true;
      continue;
    }

    if (!inPlayers) {
      applyMetaKv(meta, trimmed);
      continue;
    }

    const listMatch = trimmed.match(/^-\s+(.+)/);
    if (listMatch) {
      if (current) players.push(current);
      current = { number: '', name: '' };
      const content = listMatch[1];

      const mdMatch = content.match(/^(\d+)\.\s+(.+)/);
      if (mdMatch) {
        current.number = mdMatch[1];
        current.name = yamlUnquote(mdMatch[2].trim());
        continue;
      }

      const kvMatch = content.match(/^(\w+)\s*:\s*(.*)/);
      if (kvMatch) {
        applyPlayerKv(current, content);
        continue;
      }

      current.name = yamlUnquote(content.trim());
      continue;
    }

    if (current) {
      applyPlayerKv(current, trimmed);
    }
  }

  if (current) players.push(current);
  return { meta, players };
}

function applyMetaKv(meta: RosterMeta, line: string): void {
  const kv = line.match(/^(\w+)\s*:\s*(.+)/);
  if (!kv) return;
  const key = kv[1].toLowerCase();
  const val = yamlUnquote(kv[2].trim());
  if (key === 'name') meta.name = val;
  else if (key === 'format') meta.format = val;
  else if (key === 'halflength') meta.halfLength = parseInt(val, 10);
  else if (key === 'formation') meta.formation = val;
}

function applyPlayerKv(player: ParsedPlayer, line: string): void {
  const kv = line.match(/^(\w+)\s*:\s*(.*)/);
  if (!kv) return;
  const key = kv[1].toLowerCase();
  const val = yamlUnquote(kv[2].trim());
  if (key === 'number') player.number = String(val);
  else if (key === 'name') player.name = val;
  else if (key === 'nickname' && val) player.nickname = val;
  else if (key === 'primarypos' && val && VALID_POSITIONS.has(val)) player.primaryPos = val;
  else if (key === 'secondarypos' && val && VALID_POSITIONS.has(val)) player.secondaryPos = val;
}

/* ── CSV-with-header parser ────────────────────────────────── */

function parseCsvWithHeader(text: string): ParsedRoster {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const colIdx = new Map<string, number>();
  headers.forEach((h, i) => colIdx.set(h, i));

  const players: ParsedPlayer[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim();
    if (!row) continue;

    const values = row.split(',').map(v => v.trim());
    const player: ParsedPlayer = {
      number: values[colIdx.get('number') ?? -1] ?? '',
      name: values[colIdx.get('name') ?? -1] ?? '',
    };

    const nickname = colIdx.has('nickname') ? (values[colIdx.get('nickname')!] ?? '').trim() : '';
    if (nickname) player.nickname = nickname;

    const primaryPos = colIdx.has('primarypos') ? (values[colIdx.get('primarypos')!] ?? '').trim() : '';
    if (primaryPos && VALID_POSITIONS.has(primaryPos)) player.primaryPos = primaryPos;

    const secondaryPos = colIdx.has('secondarypos') ? (values[colIdx.get('secondarypos')!] ?? '').trim() : '';
    if (secondaryPos && VALID_POSITIONS.has(secondaryPos)) player.secondaryPos = secondaryPos;

    players.push(player);
  }

  return { meta: {}, players };
}

/* ── Markdown / legacy parser ──────────────────────────────── */

function parseMarkdownOrLegacy(text: string): ParsedRoster {
  const lines = text.split('\n');
  const meta: RosterMeta = {};
  const players: ParsedPlayer[] = [];

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
        else if (key === 'formation') meta.formation = val;
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
        else if (key === 'formation') meta.formation = val;
      }
      continue;
    }

    if (/^#|^number|^jersey|^players\s*:/i.test(trimmed)) continue;

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
