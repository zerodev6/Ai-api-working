    import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';

const MODELS = [
  { id: 'openai',       label: 'GPT-4.1',         tag: 'Fast',   color: '#10b981' },
  { id: 'openai-large', label: 'GPT-4.1 Large',   tag: 'Smart',  color: '#3b82f6' },
  { id: 'openai-fast',  label: 'GPT-4.1 Nano',    tag: 'Fastest',color: '#f59e0b' },
  { id: 'mistral',      label: 'Mistral Large',    tag: 'EU',     color: '#8b5cf6' },
  { id: 'llama',        label: 'Llama 4 (Meta)',   tag: 'Open',   color: '#ef4444' },
  { id: 'deepseek',     label: 'DeepSeek V3',      tag: 'Code',   color: '#06b6d4' },
  { id: 'deepseek-r1',  label: 'DeepSeek R1',      tag: 'Reason', color: '#0ea5e9' },
  { id: 'qwen',         label: 'Qwen 3',           tag: 'Multi',  color: '#f97316' },
  { id: 'qwen-coder',   label: 'Qwen Coder',       tag: 'Code',   color: '#a855f7' },
  { id: 'searchgpt',    label: 'SearchGPT',        tag: 'Web',    color: '#14b8a6' },
];

export default function Home() {
  const [model, setModel] = useState('openai');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const readerRef = useRef(null);
  const currentModel = MODELS.find(m => m.id === model) || MODELS[0];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = useCallback(async () => {
    const text = prompt.trim();
    if (!text || streaming) return;
    setPrompt(''); setShowModels(false); setStreaming(true);

    setMessages(prev => [
      ...prev,
      { role: 'user', text },
      { role: 'ai', text: '', modelLabel: currentModel.label, done: false },
    ]);

    try {
      const res = await fetch(`/api/chat?prompt=${encodeURIComponent(text)}&model=${model}`);
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '', fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') break;
          try {
            const json = JSON.parse(raw);
            if (json.error) fullText = `⚠️ ${json.error}`;
            else if (json.choices?.[0]?.delta?.content != null) fullText += json.choices[0].delta.content;
            else if (typeof json.text === 'string') fullText += json.text;
          } catch {
            if (raw && raw !== '[DONE]') fullText += raw;
          }
          setMessages(prev => {
            const c = [...prev];
            c[c.length - 1] = { ...c[c.length - 1], text: fullText };
            return c;
          });
        }
      }

      setMessages(prev => {
        const c = [...prev];
        c[c.length - 1] = { ...c[c.length - 1], text: fullText || '(no response)', done: true };
        return c;
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setMessages(prev => {
        const c = [...prev];
        c[c.length - 1] = { ...c[c.length - 1], text: `⚠️ ${err.message}`, done: true };
        return c;
      });
    } finally {
      setStreaming(false);
      readerRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [prompt, streaming, model, currentModel]);

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function stopStream() {
    readerRef.current?.cancel();
    setStreaming(false);
    setMessages(prev => {
      const c = [...prev];
      if (c.length && !c[c.length - 1].done) c[c.length - 1] = { ...c[c.length - 1], done: true };
      return c;
    });
  }

  return (
    <>
      <Head>
        <title>PolyChat — Free AI Models</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="root">
        <header className="header">
          <div className="logo"><span className="logo-icon">⬡</span><span className="logo-name">PolyChat</span></div>
          <div className="model-wrap" onClick={() => setShowModels(v => !v)}>
            <span className="model-dot" style={{ background: currentModel.color }} />
            <span className="model-label">{currentModel.label}</span>
            <span className="model-tag" style={{ color: currentModel.color }}>{currentModel.tag}</span>
            <svg className={`chevron ${showModels ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
              <path d="M2 4.5L6 8L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          {showModels && (
            <div className="model-dropdown" onClick={e => e.stopPropagation()}>
              <div className="dropdown-title">Choose Model</div>
              {MODELS.map(m => (
                <div key={m.id} className={`dropdown-item ${m.id === model ? 'active' : ''}`}
                  onClick={() => { setModel(m.id); setShowModels(false); }}>
                  <span className="di-dot" style={{ background: m.color }} />
                  <span className="di-label">{m.label}</span>
                  <span className="di-tag" style={{ color: m.color, borderColor: m.color + '44' }}>{m.tag}</span>
                </div>
              ))}
            </div>
          )}
        </header>

        <main className="chat" onClick={() => showModels && setShowModels(false)}>
          {messages.length === 0 && (
            <div className="empty">
              <div className="empty-icon">⬡</div>
              <h1>Free AI, 10 models.</h1>
              <p>Powered by Pollinations.ai · No signup required</p>
              <div className="chips">
                {['Hello! Who are you?', 'Write Python quicksort', 'Explain black holes', 'Write a haiku about code'].map(s => (
                  <button key={s} className="chip" onClick={() => { setPrompt(s); inputRef.current?.focus(); }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`msg ${msg.role}`}>
              <div className="msg-meta">{msg.role === 'user' ? 'You' : msg.modelLabel || 'AI'}</div>
              <div className="bubble">
                <pre className="bubble-text">{msg.text || ''}</pre>
                {msg.role === 'ai' && !msg.done && <span className="cursor" />}
              </div>
            </div>
          ))}
          <div ref={bottomRef} style={{ height: 1 }} />
        </main>

        <footer className="footer">
          <div className="input-row">
            <textarea ref={inputRef} className="input" value={prompt} rows={1}
              placeholder={`Message ${currentModel.label}…`}
              onChange={e => setPrompt(e.target.value)} onKeyDown={handleKey} />
            {streaming
              ? <button className="btn stop" onClick={stopStream}>■</button>
              : <button className="btn send" onClick={send} disabled={!prompt.trim()}>▶</button>}
          </div>
          <div className="hint">
            <span>Enter to send · Shift+Enter for newline</span>
            <span>API: <code>/api/chat?prompt=hi&amp;model={model}</code></span>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; font-family: 'Space Grotesk', sans-serif; background: #0c0c10; color: #e2dff0; overflow: hidden; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 4px; }
      `}</style>

      <style jsx>{`
        .root { display: flex; flex-direction: column; height: 100vh; max-width: 800px; margin: 0 auto; position: relative; }
        .header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #1e1e2c; background: #0c0c10; position: relative; flex-shrink: 0; z-index: 100; }
        .logo { display: flex; align-items: center; gap: 7px; margin-right: auto; }
        .logo-icon { font-size: 20px; color: #7c6af7; }
        .logo-name { font-weight: 700; font-size: 16px; letter-spacing: -.02em; }
        .model-wrap { display: flex; align-items: center; gap: 7px; background: #16161f; border: 1px solid #2a2a3a; border-radius: 8px; padding: 7px 12px; cursor: pointer; user-select: none; transition: border-color .15s; }
        .model-wrap:hover { border-color: #3a3a50; }
        .model-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .model-label { font-size: 13px; font-weight: 500; white-space: nowrap; }
        .model-tag { font-size: 10px; font-family: 'IBM Plex Mono', monospace; }
        .chevron { color: #666; transition: transform .2s; }
        .chevron.open { transform: rotate(180deg); }
        .model-dropdown { position: absolute; top: calc(100% + 6px); right: 16px; background: #13131c; border: 1px solid #2a2a3a; border-radius: 10px; min-width: 260px; overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,.6); z-index: 200; }
        .dropdown-title { padding: 10px 14px 6px; font-size: 10px; letter-spacing: .1em; color: #555; font-family: 'IBM Plex Mono', monospace; text-transform: uppercase; }
        .dropdown-item { display: flex; align-items: center; gap: 9px; padding: 10px 14px; cursor: pointer; transition: background .1s; border-top: 1px solid #1e1e2c; }
        .dropdown-item:hover { background: #1e1e2c; }
        .dropdown-item.active { background: #1c1c2e; }
        .di-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .di-label { font-size: 13px; flex: 1; }
        .di-tag { font-size: 10px; font-family: 'IBM Plex Mono', monospace; border: 1px solid; border-radius: 4px; padding: 1px 5px; }
        .chat { flex: 1; overflow-y: auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 16px; }
        .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 10px; text-align: center; padding: 40px 20px; }
        .empty-icon { font-size: 44px; color: #7c6af7; opacity: .4; }
        .empty h1 { font-size: 24px; font-weight: 700; letter-spacing: -.03em; }
        .empty p { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #555; }
        .chips { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin-top: 12px; }
        .chip { background: #16161f; border: 1px solid #2a2a3a; color: #888; font-size: 12px; padding: 7px 13px; border-radius: 20px; cursor: pointer; transition: all .15s; font-family: 'Space Grotesk', sans-serif; }
        .chip:hover { border-color: #7c6af7; color: #c4beff; background: #1c1a2e; }
        .msg { display: flex; flex-direction: column; gap: 4px; animation: rise .2s ease; }
        @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .msg.user { align-items: flex-end; } .msg.ai { align-items: flex-start; }
        .msg-meta { font-size: 10px; font-family: 'IBM Plex Mono', monospace; color: #444; padding: 0 4px; letter-spacing: .05em; text-transform: uppercase; }
        .bubble { max-width: min(88%, 620px); padding: 11px 15px; border-radius: 12px; word-break: break-word; }
        .msg.user .bubble { background: #1c1a2e; border: 1px solid #3a3060; border-radius: 12px 12px 3px 12px; }
        .msg.ai .bubble { background: #16161f; border: 1px solid #2a2a3a; border-radius: 3px 12px 12px 12px; }
        .bubble-text { font-family: 'IBM Plex Mono', monospace; font-size: 13px; line-height: 1.7; white-space: pre-wrap; color: #d8d4f0; }
        .msg.user .bubble-text { color: #c4beff; }
        .cursor { display: inline-block; width: 2px; height: 14px; background: #7c6af7; margin-left: 2px; vertical-align: middle; animation: blink .7s step-end infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .footer { flex-shrink: 0; padding: 10px 16px 14px; border-top: 1px solid #1e1e2c; background: #0c0c10; }
        .input-row { display: flex; gap: 8px; align-items: flex-end; }
        .input { flex: 1; background: #16161f; border: 1px solid #2a2a3a; border-radius: 10px; padding: 11px 14px; color: #e2dff0; font-family: 'Space Grotesk', sans-serif; font-size: 14px; resize: none; outline: none; max-height: 120px; overflow-y: auto; line-height: 1.5; transition: border-color .15s; }
        .input:focus { border-color: #4a3fa0; }
        .input::placeholder { color: #3a3a50; }
        .btn { width: 42px; height: 42px; border-radius: 10px; border: none; cursor: pointer; font-size: 15px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all .15s; }
        .btn.send { background: #7c6af7; color: #fff; }
        .btn.send:hover:not(:disabled) { background: #9b8dff; transform: scale(1.05); }
        .btn.send:disabled { background: #2a2a3a; color: #3a3a50; cursor: not-allowed; }
        .btn.stop { background: #3a1a1a; color: #f87171; border: 1px solid #5a2020; }
        .btn.stop:hover { background: #4a2020; }
        .hint { display: flex; justify-content: space-between; margin-top: 6px; font-size: 10px; color: #333; font-family: 'IBM Plex Mono', monospace; flex-wrap: wrap; gap: 4px; }
        .hint code { color: #4a3fa0; }
        @media (max-width: 500px) { .model-tag, .hint span:first-child { display: none; } .empty h1 { font-size: 20px; } .bubble-text { font-size: 12px; } }
      `}</style>
    </>
  );
}
