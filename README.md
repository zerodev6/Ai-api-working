# PolyChat — Free AI Chat API on Vercel

Powered by [Pollinations.ai](https://pollinations.ai) — **no API key required**.

## 🚀 Deploy to Vercel (3 steps)

### Option A — One-click (GitHub)
1. Push this folder to a GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repo → click **Deploy**

### Option B — Vercel CLI
```bash
npm i -g vercel
cd pollinations-api
vercel
```

## 📡 API Endpoints

### Chat
```
GET /api/chat?prompt=Hello&model=openai
```
| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| prompt | ✅ | — | Your message |
| model | ❌ | openai | Model ID (see /api/models) |
| system | ❌ | — | System prompt |

**Response:**
```json
{
  "success": true,
  "response": "Hello! How can I help you?",
  "model": "openai",
  "prompt": "Hello"
}
```

### List Models
```
GET /api/models
```

## 🤖 Available Models
| ID | Name |
|----|------|
| openai | GPT-4.1 |
| openai-large | GPT-4.1 Large |
| openai-fast | GPT-4.1 Nano |
| claude | Claude (Anthropic) |
| gemini | Gemini (Google) |
| mistral | Mistral Large |
| deepseek | DeepSeek V3 |
| deepseek-r1 | DeepSeek R1 (reasoning) |
| qwen | Qwen 3 |
| searchgpt | SearchGPT (web search) |
| llamascout | Llama 4 Scout |

## 🧩 Use as API in your own app
```python
import requests
res = requests.get("https://YOUR-APP.vercel.app/api/chat", params={
    "prompt": "What is Python?",
    "model": "openai"
})
print(res.json()["response"])
```

```javascript
const res = await fetch('/api/chat?prompt=Hello&model=mistral');
const data = await res.json();
console.log(data.response);
```

## Local Dev
```bash
npm install
npm run dev
# open http://localhost:3000
```
