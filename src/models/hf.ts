import { AutoModelForSequenceClassification, AutoTokenizer, env, pipeline } from '@huggingface/transformers';
import { MODEL_CACHE_DIR } from '../app/config';

/**
 * Thin loaders around Transformers.js, shared by the app and the eval suite.
 * Models run on CPU in Node via ONNX Runtime. No network calls at inference
 * time: weights are downloaded once into MODEL_CACHE_DIR, then reused.
 *
 * Generation is greedy (do_sample: false), so the same prompt on the same
 * pinned model gives the same reply on every run.
 */

env.cacheDir = MODEL_CACHE_DIR;

export interface ModelSpec {
  id: string;
  revision: string;
  dtype: string;
  /** Number of external weight files for large models (model_q4.onnx_data, _data_1, ...). */
  externalData?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type Generate = (messages: ChatMessage[], maxNewTokens: number) => Promise<string>;
/** Relevance of a passage to a query, as a raw logit: above 0 means relevant. */
export type Rerank = (query: string, passage: string) => Promise<number>;
export type Classify = (text: string) => Promise<{ label: string; score: number }[]>;

// Transformers.js pipeline overloads are too wide for strict TS, so the
// loaders narrow them to the two call shapes this repo uses.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPipeline = (input: unknown, options?: Record<string, unknown>) => Promise<any>;

const cache = new Map<string, Promise<AnyPipeline>>();

function load(task: string, spec: ModelSpec): Promise<AnyPipeline> {
  const key = `${task}:${spec.id}@${spec.revision}:${spec.dtype}`;
  let p = cache.get(key);
  if (!p) {
    p = (pipeline as unknown as (t: string, m: string, o: object) => Promise<AnyPipeline>)(task, spec.id, {
      revision: spec.revision,
      dtype: spec.dtype,
      ...(spec.externalData ? { use_external_data_format: spec.externalData } : {}),
    });
    cache.set(key, p);
  }
  return p;
}

export function hfGenerator(spec: ModelSpec): Generate {
  return async (messages, maxNewTokens) => {
    const gen = await load('text-generation', spec);
    const out = await gen(messages, { max_new_tokens: maxNewTokens, do_sample: false });
    const turns = out?.[0]?.generated_text;
    const last = Array.isArray(turns) ? turns[turns.length - 1]?.content : turns;
    return String(last ?? '').trim();
  };
}

export function hfClassifier(spec: ModelSpec): Classify {
  return async (text) => {
    const clf = await load('text-classification', spec);
    const out = await clf(text, { top_k: null });
    const rows = (Array.isArray(out?.[0]) ? out[0] : out) as { label: string; score: number }[];
    return rows.map((r) => ({ label: String(r.label), score: Number(r.score) }));
  };
}

/** Cross-encoder reranker: scores how well a passage answers a query. */
export function hfReranker(spec: ModelSpec): Rerank {
  let loaded: Promise<[unknown, unknown]> | undefined;
  return async (query, passage) => {
    loaded ??= Promise.all([
      AutoTokenizer.from_pretrained(spec.id, { revision: spec.revision }),
      AutoModelForSequenceClassification.from_pretrained(spec.id, {
        revision: spec.revision,
        dtype: spec.dtype as 'q8',
      }),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [tokenizer, model] = (await loaded) as [any, any];
    const features = tokenizer([query], { text_pair: [passage], padding: true, truncation: true });
    const out = await model(features);
    return Number(out.logits.data[0]);
  };
}
