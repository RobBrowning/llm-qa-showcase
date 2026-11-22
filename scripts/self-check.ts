/**
 * Offline checks that need no models: retrieval routes every eval question
 * where the data says it should, data files reference real kb chunks, and
 * the price formatter behaves. Runs in CI before any model download, so a
 * data typo fails in seconds rather than after a long eval run.
 */
import assert from 'node:assert/strict';
import { Retriever } from '../src/app/retrieval';
import { SCOPE_THRESHOLD } from '../src/app/config';
import { formatPrices, pricesGrounded } from '../src/app/bot';
import { CALIBRATION, CONSISTENCY, GOLDEN, HOLDOUT, OUT_OF_SCOPE, reference } from '../src/eval/data';

const r = new Retriever();
let checks = 0;
const ok = (cond: boolean, msg: string) => {
  assert.ok(cond, msg);
  checks++;
};

for (const g of GOLDEN) {
  const top = r.search(g.question)[0];
  ok(top?.chunk.id === g.source, `${g.id}: expected top chunk ${g.source}, got ${top?.chunk.id}`);
  ok((top?.score ?? 0) >= SCOPE_THRESHOLD, `${g.id}: score ${top?.score} is under the scope threshold`);
  for (const f of g.mustInclude) ok(new RegExp(f, 'i').test(reference(g.source)), `${g.id}: fact /${f}/ is not in ${g.source}`);
}
for (const o of OUT_OF_SCOPE) {
  ok((r.search(o.question)[0]?.score ?? 0) < SCOPE_THRESHOLD, `${o.id}: off-topic question scores over the scope threshold`);
}
for (const c of CONSISTENCY) {
  ok(new RegExp(c.fact, 'i').test(reference(c.source)), `${c.id}: fact /${c.fact}/ is not in ${c.source}`);
  for (const q of c.questions) {
    const top = r.search(q)[0];
    ok(top?.chunk.id === c.source, `${c.id}: "${q}" retrieves ${top?.chunk.id}, expected ${c.source}`);
    ok((top?.score ?? 0) >= SCOPE_THRESHOLD, `${c.id}: "${q}" is under the scope threshold`);
  }
}
// Hold-out: data integrity only (facts really are in kb/). Retrieval routing is
// deliberately NOT checked here, so nothing is tuned against the hold-out set.
for (const h of HOLDOUT.facts) {
  for (const f of h.mustInclude) ok(new RegExp(f, 'i').test(reference(h.source)), `${h.id}: fact /${f}/ is not in ${h.source}`);
}
for (const j of CALIBRATION) ok(reference(j.source).length > 0, `${j.id}: unknown source ${j.source}`);

ok(formatPrices('It costs £40 or £12.5 or £ 7.00') === 'It costs £40.00 or £12.50 or £7.00', 'formatPrices normalises prices');

const ctx = 'E-bike, half day: £25.00\nE-bike, full day: £40.00';
ok(pricesGrounded('An e-bike is £40 for a full day.', ctx), 'grounding accepts a price from the context');
ok(pricesGrounded('No prices here.', ctx), 'grounding accepts a reply with no prices');
ok(!pricesGrounded('An e-bike costs £1.00 per hour.', ctx), 'grounding rejects a price not in the context');
ok(!pricesGrounded('£40.00, or £35.00 at weekends.', ctx), 'grounding rejects one invented price among real ones');

console.log(`self-check: ${checks} checks passed`);
