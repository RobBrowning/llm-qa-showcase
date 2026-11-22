import { test, metric } from './fixtures';
import { CONSISTENCY, GOLDEN, UNANSWERABLE } from '../../src/eval/data';
import { MODELS, RELEVANCE_THRESHOLD } from '../../src/app/config';
import { Retriever } from '../../src/app/retrieval';
import { hfReranker } from '../../src/models/hf';

/**
 * Diagnostic, not a gate: prints the reranker score for every eval question
 * against the paragraph retrieval picks, so the relevance threshold (ADR 0010)
 * is set from evidence. Uses eval questions only, never the hold-out set.
 */

test('relevance scores for eval questions (report only)', async () => {
  test.setTimeout(10 * 60_000);
  const retriever = new Retriever();
  const rerank = hfReranker(MODELS.reranker);
  const score = async (q: string) => {
    const top = retriever.search(q)[0];
    return top ? (await rerank(q, `${top.chunk.heading}. ${top.chunk.text}`)).toFixed(1) : 'none';
  };
  const answerable: string[] = [];
  for (const g of GOLDEN) answerable.push(`${g.id} ${await score(g.question)}`);
  for (const c of CONSISTENCY) for (const [i, q] of c.questions.entries()) answerable.push(`${c.id}.${i + 1} ${await score(q)}`);
  const unanswerable: string[] = [];
  for (const u of UNANSWERABLE) unanswerable.push(`${u.id} ${await score(u.question)}`);
  metric('relevance answerable', `threshold ${RELEVANCE_THRESHOLD}: ${answerable.join(', ')}`);
  metric('relevance unanswerable', unanswerable.join(', '));
});
