import { test, expect } from '@playwright/test';

/**
 * Chat API contract, in stub mode. Replaces the manual check "send bad
 * requests to the chat endpoint and confirm clear 4xx errors, never a crash".
 */

test.describe('chat API contract', () => {
  test('health reports the mode and no defects @smoke', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true, mode: 'stub', defects: [] });
  });

  test('a valid message returns reply, sources and guard fields', async ({ request }) => {
    const res = await request.post('/api/chat', { data: { message: 'What is the deposit?' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(['guarded', 'reply', 'sources']);
    expect(typeof body.reply).toBe('string');
    expect(body.reply.length).toBeGreaterThan(0);
    expect(body.sources).toEqual(['bookings-and-refunds#deposit']);
    expect(body.guarded).toBeNull();
  });

  test('a blank message is rejected with 400', async ({ request }) => {
    const res = await request.post('/api/chat', { data: { message: '   ' } });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'message is required' });
  });

  test('a non-JSON body is rejected with 400', async ({ request }) => {
    const res = await request.post('/api/chat', { data: 'not json', headers: { 'Content-Type': 'text/plain' } });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'body must be JSON' });
  });

  test('a message over 1000 characters is rejected with 413', async ({ request }) => {
    const res = await request.post('/api/chat', { data: { message: 'a'.repeat(1001) } });
    expect(res.status()).toBe(413);
  });

  test('an unknown route returns 404', async ({ request }) => {
    const res = await request.get('/api/nope');
    expect(res.status()).toBe(404);
  });
});
