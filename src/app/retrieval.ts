import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Keyword retrieval over the knowledge base. Deliberately simple and
 * deterministic: each "## " section is a chunk, scored by summed IDF of the
 * query terms it contains. No embeddings, so retrieval never varies by run.
 */

export interface Chunk {
  id: string; // e.g. "hire-and-pricing#bike-types-and-prices"
  doc: string; // e.g. "hire-and-pricing"
  heading: string;
  text: string;
}

export interface Hit {
  chunk: Chunk;
  score: number;
}

const STOPWORDS = new Set(
  (
    'a an and are as at be bike bikes by can do does for from get have how i if in is it ' +
    'me my of on or the to what when where which who will with you your wheelwise much many'
  ).split(' '),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\be-?bikes?\b/g, 'ebike')
    .replace(/[^a-z0-9£ ]+/g, ' ')
    .split(/\s+/)
    .map(stem)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Tiny suffix stripper so "refunds" matches "refund" and "cancelling" matches "cancel". */
function stem(t: string): string {
  if (t.length <= 3) return t;
  let s = t;
  if (/ies$/.test(s)) s = s.replace(/ies$/, 'y');
  else if (/ations?$/.test(s)) s = s.replace(/ations?$/, '');
  else if (/ing$/.test(s)) s = s.replace(/ing$/, '');
  else if (/[^s]s$/.test(s)) s = s.slice(0, -1);
  return s.replace(/ll$/, 'l');
}

export function loadChunks(kbDir = join(process.cwd(), 'kb')): Chunk[] {
  const chunks: Chunk[] = [];
  for (const file of readdirSync(kbDir).filter((f) => f.endsWith('.md')).sort()) {
    const doc = file.replace(/\.md$/, '');
    const body = readFileSync(join(kbDir, file), 'utf8');
    for (const section of body.split(/^## /m).slice(1)) {
      const [heading = '', ...rest] = section.split('\n');
      const slug = heading.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      chunks.push({ id: `${doc}#${slug}`, doc, heading: heading.trim(), text: rest.join('\n').trim() });
    }
  }
  return chunks;
}

export class Retriever {
  private readonly idf = new Map<string, number>();
  private readonly terms: Set<string>[];

  constructor(readonly chunks: Chunk[] = loadChunks()) {
    this.terms = chunks.map((c) => new Set(tokenize(`${c.heading} ${c.text}`)));
    const df = new Map<string, number>();
    for (const set of this.terms) for (const t of set) df.set(t, (df.get(t) ?? 0) + 1);
    for (const [t, n] of df) this.idf.set(t, Math.log(1 + chunks.length / n));
  }

  /** Ranked hits, best first. Ties keep knowledge-base order, so ranking is stable. */
  search(query: string): Hit[] {
    const q = new Set(tokenize(query));
    return this.chunks
      .map((chunk, i) => {
        let score = 0;
        for (const t of q) if (this.terms[i]!.has(t)) score += this.idf.get(t) ?? 0;
        return { chunk, score };
      })
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score);
  }
}
