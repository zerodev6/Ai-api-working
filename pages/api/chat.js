// pages/api/chat.js
// Vercel serverless function — proxies to pollinations.ai text API
// Usage: GET /api/chat?prompt=Hello&model=openai

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { prompt, model = 'openai', stream = 'false', system = '' } = req.query;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ success: false, message: 'prompt parameter is required' });
  }

  try {
    const params = new URLSearchParams({ model, stream: 'false' });
    if (system) params.append('system', system);

    const encodedPrompt = encodeURIComponent(prompt.trim());
    const url = `https://text.pollinations.ai/${encodedPrompt}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PollinationsProxy/1.0)',
        'Accept': 'text/plain, */*',
      },
      signal: AbortSignal.timeout(55000), // just under Vercel's 60s limit
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `Pollinations API error: ${response.status} ${response.statusText}`,
      });
    }

    const text = await response.text();

    if (!text || !text.trim()) {
      return res.status(502).json({ success: false, message: 'Empty response from Pollinations' });
    }

    return res.status(200).json({
      success: true,
      response: text.trim(),
      model,
      prompt: prompt.trim(),
    });

  } catch (err) {
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    return res.status(isTimeout ? 504 : 500).json({
      success: false,
      message: isTimeout ? 'Request timed out' : `Server error: ${err.message}`,
    });
  }
}
