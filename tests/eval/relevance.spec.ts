import { test, expect, metric } from './fixtures';
import { CONSISTENCY, GOLDEN, UNANSWERABLE } from '../../src/eval/data';
import { MODELS, RELEVANCE_THRESHOLD, REPLY_DONT_KNOW } from '../../src/app/config';
import { Retriever } from '../../src/app/retrieval';
import { hfReranker } from '../../src/models/hf';

/**
 * Relevance guard (ADR 0010).
 * Replaces the manual check "confirm the bot says it doesn't know only when
 * the docs don't cover the question, and answers whenever they do".
 * Uses eval questions only, never the hold-out set.
 */

test.describe('relevance', () => {
  test('the threshold separates answerable from unanswerable eval questions', async () => {
    test.setTimeout(10 * 60_000);
    const retriever = new Retriever();
    const rerank = hfReranker(MODELS.reranker);
    const score = async (q: string) => {
      const top = retriever.search(q)[0];
      return top ? rerank(q, `${top.chunk.heading}. ${top.chunk.text}`) : undefined;
    };

    const answerable: { id: string; s: number }[] = [];
    for (const g of GOLDEN) answerable.push({ id: g.id, s: (await score(g.question))! });
    for (const c of CONSISTENCY) {
      for (const [i, q] of c.questions.entries()) answerable.push({ id: `${c.id}.${i + 1}`, s: (await score(q))! });
    }
    // Questions the keyword scope guard already refuses have no paragraph to score.
    const unanswerable: { id: string; s: number }[] = [];
    for (const u of UNANSWERABLE) {
      const s = await score(u.question);
      if (s !== undefined) unanswerable.push({ id: u.id, s });
    }

    const fmt = (rows: { id: string; s: number }[]) => rows.map((r) => `${r.id} ${r.s.toFixed(1)}`).join(', ');
    metric('relevance answerable', `threshold ${RELEVANCE_THRESHOLD}: ${fmt(answerable)}`);
    metric('relevance unanswerable', fmt(unanswerable));

    expect(unanswerable.length, 'at least one unanswerable question must reach the relevance check').toBeGreaterThan(0);
    const lowestAnswerable = Math.min(...answerable.map((r) => r.s));
    const highestUnanswerable = Math.max(...unanswerable.map((r) => r.s));
    expect(lowestAnswerable, `answerable questions below the threshold: ${fmt(answerable.filter((r) => r.s < RELEVANCE_THRESHOLD))}`).toBeGreaterThan(RELEVANCE_THRESHOLD);
    expect(highestUnanswerable, `unanswerable questions above the threshold: ${fmt(unanswerable.filter((r) => r.s >= RELEVANCE_THRESHOLD))}`).toBeLessThan(RELEVANCE_THRESHOLD);
  });

  test('the relevance guard fires on a question the docs do not cover', async ({ chat }) => {
    // Gate test: U02 matches the age rules on "hire" and "ride", so it passes
    // the keyword scope guard. Only the relevance guard can stop it.
    const res = await chat('Can I hire a bike for my dog to ride in a trailer?');
    expect(res.guarded).toBe('relevance');
    expect(res.reply).toBe(REPLY_DONT_KNOW);
  });
});
