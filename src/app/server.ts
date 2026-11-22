import { createServer, type IncomingMessage } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Bot } from './bot';
import { MODEL_MODE } from './config';
import { activeDefects } from './defects';

/**
 * Minimal HTTP server for the Wheelwise chatbot.
 *   GET  /            chat page
 *   GET  /health      { ok, mode, defects }
 *   POST /api/chat    { message } -> { reply, sources, guarded }
 * Models load lazily on the first chat request, so the server starts fast.
 */

const PORT = Number(process.env.PORT ?? 3100);
const MAX_MESSAGE_CHARS = 1000;
const bot = new Bot();
const page = readFileSync(join(process.cwd(), 'public', 'index.html'), 'utf8');

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

const server = createServer(async (req, res) => {
  const send = (status: number, body: unknown, type = 'application/json') => {
    res.writeHead(status, { 'Content-Type': type });
    res.end(type === 'application/json' ? JSON.stringify(body) : String(body));
  };

  try {
    if (req.method === 'GET' && req.url === '/') return send(200, page, 'text/html; charset=utf-8');
    if (req.method === 'GET' && req.url === '/health') {
      return send(200, { ok: true, mode: MODEL_MODE, defects: activeDefects() });
    }
    if (req.method === 'POST' && req.url === '/api/chat') {
      const body = (await readJson(req)) as { message?: unknown };
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message) return send(400, { error: 'message is required' });
      if (message.length > MAX_MESSAGE_CHARS) {
        return send(413, { error: `message must be ${MAX_MESSAGE_CHARS} characters or fewer` });
      }
      return send(200, await bot.ask(message));
    }
    return send(404, { error: 'not found' });
  } catch (err) {
    if (err instanceof SyntaxError) return send(400, { error: 'body must be JSON' });
    console.error(err);
    return send(500, { error: 'internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`Wheelwise chatbot on http://localhost:${PORT} (mode=${MODEL_MODE}, defects=${activeDefects().join(',') || 'none'})`);
});
