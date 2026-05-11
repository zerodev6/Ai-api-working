// pages/api/models.js
// Returns available text models from pollinations.ai

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Static well-known models + attempt to fetch live list
  const fallback = [
    { id: 'openai',       name: 'GPT-4.1 (OpenAI)',        description: 'Fast, smart, great for most tasks' },
    { id: 'openai-large', name: 'GPT-4.1 Large (OpenAI)',  description: 'More powerful, slower' },
    { id: 'openai-fast',  name: 'GPT-4.1 Nano (OpenAI)',   description: 'Fastest OpenAI model' },
    { id: 'claude',       name: 'Claude (Anthropic)',       description: 'Great for writing & reasoning' },
    { id: 'gemini',       name: 'Gemini (Google)',          description: 'Google\'s latest model' },
    { id: 'mistral',      name: 'Mistral Large',            description: 'European open-weight model' },
    { id: 'deepseek',     name: 'DeepSeek V3',              description: 'Strong coding & reasoning' },
    { id: 'deepseek-r1',  name: 'DeepSeek R1',              description: 'Reasoning/thinking model' },
    { id: 'qwen',         name: 'Qwen 3 (Alibaba)',         description: 'Multilingual, great at code' },
    { id: 'searchgpt',    name: 'SearchGPT',                description: 'GPT with live web search' },
    { id: 'llamascout',   name: 'Llama 4 Scout (Meta)',     description: 'Meta open-source model' },
  ];

  try {
    const r = await fetch('https://text.pollinations.ai/models', {
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const live = await r.json();
      // live is an array of model id strings or objects
      const liveIds = Array.isArray(live)
        ? live.map(m => (typeof m === 'string' ? m : m.name || m.id))
        : [];

      // Merge: keep fallback metadata, add unknown live models raw
      const known = new Set(fallback.map(f => f.id));
      const extras = liveIds
        .filter(id => !known.has(id))
        .map(id => ({ id, name: id, description: 'Available model' }));

      return res.status(200).json({ success: true, models: [...fallback, ...extras] });
    }
  } catch (_) { /* fall through */ }

  return res.status(200).json({ success: true, models: fallback });
}
