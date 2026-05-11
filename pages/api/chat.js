// pages/api/chat.js
export const config = { api: { responseLimit: false } };

const FREE_MODELS = new Set([
  'openai', 'openai-fast', 'openai-large',
  'mistral', 'llama', 'deepseek', 'deepseek-r1',
  'qwen', 'qwen-coder', 'searchgpt',
]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { prompt, model = 'openai' } = req.query;
  if (!prompt?.trim()) return res.status(400).json({ success: false, message: 'prompt required' });

  const safeModel = FREE_MODELS.has(model) ? model : 'openai';

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.write(': connected\n\n');
  if (res.flush) res.flush();

  try {
    const upstream = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: safeModel,
        messages: [{ role: 'user', content: prompt.trim() }],
        stream: true,
      }),
      signal: AbortSignal.timeout(55000),
    });

    if (!upstream.ok) {
      const err = await upstream.text().catch(() => '');
      res.write(`data: ${JSON.stringify({ error: `API ${upstream.status}: ${err.slice(0, 100)}` })}\n\n`);
      return res.end();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
      if (res.flush) res.flush();
    }
    res.write('\ndata: [DONE]\n\n');
    res.end();

  } catch (err) {
    const msg = err.name === 'TimeoutError' || err.name === 'AbortError'
      ? 'Timed out — try a faster model like GPT-4.1 Nano'
      : `Error: ${err.message}`;
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
}
