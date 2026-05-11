import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

const TYPING_CHARS = ['▊', '▋', '▌'];

export default function Home() {
  const [models, setModels] = useState([]);
  const [model, setModel] = useState('openai');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [typingIdx, setTypingIdx] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch('/api/models')
      .then(r => r.json())
      .then(d => { if (d.models) setModels(d.models); });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setTypingIdx(i => (i + 1) % TYPING_CHARS.length), 350);
    return () => clearInterval(id);
  }, [loading]);

  const selectedModel = models.find(m => m.id === model);

  async function send() {
    const text = prompt.trim();
    if (!text || loading) return;
    setPrompt('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/chat?prompt=${encodeURIComponent(text)}&model=${model}`);
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: 'ai', text: data.success ? data.response : `Error: ${data.message}`, model },
      ]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Network error. Please try again.', error: true }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      <Head>
        <title>PolyChat — Free AI API</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="root">
        {/* Grain overlay */}
        <div className="grain" />

        {/* Header */}
        <header className="header">
          <div className="logo">
            <span className="logo-mark">◈</span>
            <span className="logo-text">PolyChat</span>
            <span className="logo-sub">via Pollinations.ai</span>
          </div>

          {/* Model picker */}
          <div className="model-picker">
            <button className="model-btn" onClick={() => setShowModels(v => !v)}>
              <span className="model-dot" />
              <span>{selectedModel?.name || model}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d={showModels ? 'M2 7L5 4L8 7' : 'M2 3L5 6L8 3'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {showModels && (
              <div className="model-dropdown">
                <div className="model-dropdown-label">SELECT MODEL</div>
                {models.map(m => (
                  <button
                    key={m.id}
                    className={`model-option ${m.id === model ? 'active' : ''}`}
                    onClick={() => { setModel(m.id); setShowModels(false); }}
                  >
                    <span className="model-option-name">{m.name}</span>
                    <span className="model-option-desc">{m.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <a href="/api/chat?prompt=Hello" target="_blank" className="api-badge">API ↗</a>
        </header>

        {/* Chat area */}
        <main className="chat">
          {messages.length === 0 && (
            <div className="empty">
              <div className="empty-glyph">◈</div>
              <h1 className="empty-title">Free AI, any model.</h1>
              <p className="empty-sub">Powered by Pollinations.ai — no key, no signup.</p>
              <div className="suggestions">
                {['Explain quantum entanglement simply', 'Write a haiku about rain', 'Debug my Python code', 'What is the speed of light?'].map(s => (
                  <button key={s} className="suggestion" onClick={() => { setPrompt(s); inputRef.current?.focus(); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`msg msg-${msg.role}`}>
              <div className="msg-label">{msg.role === 'user' ? 'YOU' : (models.find(m => m.id === msg.model)?.name || msg.model || 'AI').toUpperCase()}</div>
              <div className="msg-bubble">
                <pre className="msg-text">{msg.text}</pre>
              </div>
            </div>
          ))}

          {loading && (
            <div className="msg msg-ai">
              <div className="msg-label">{selectedModel?.name?.toUpperCase() || 'AI'}</div>
              <div className="msg-bubble">
                <span className="typing">{TYPING_CHARS[typingIdx]}</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </main>

        {/* Input bar */}
        <footer className="footer">
          <div className="input-row">
            <textarea
              ref={inputRef}
              className="input"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Send a message…"
              rows={1}
            />
            <button className={`send-btn ${loading || !prompt.trim() ? 'disabled' : ''}`} onClick={send} disabled={loading || !prompt.trim()}>
              {loading
                ? <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="22" strokeDashoffset="0"><animateTransform attributeName="transform" type="rotate" from="0 9 9" to="360 9 9" dur="0.8s" repeatCount="indefinite" /></circle></svg>
                : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9H15M15 9L10 4M15 9L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              }
            </button>
          </div>
          <div className="footer-note">
            Endpoint: <code>/api/chat?prompt=…&amp;model={model}</code>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #080810; color: #e8e4f0; font-family: 'Syne', sans-serif; }
      `}</style>

      <style jsx>{`
        .root {
          display: flex; flex-direction: column; height: 100vh; max-width: 820px;
          margin: 0 auto; position: relative; overflow: hidden;
        }
        .grain {
          position: fixed; inset: 0; pointer-events: none; z-index: 9999; opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 128px;
        }

        /* Header */
        .header {
          display: flex; align-items: center; gap: 12px; padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: rgba(8,8,16,0.9); backdrop-filter: blur(12px);
          position: sticky; top: 0; z-index: 100; flex-shrink: 0;
        }
        .logo { display: flex; align-items: baseline; gap: 8px; margin-right: auto; }
        .logo-mark { font-size: 20px; color: #b8a9ff; line-height: 1; }
        .logo-text { font-size: 17px; font-weight: 700; letter-spacing: -0.03em; color: #f0ecff; }
        .logo-sub { font-size: 11px; color: #6b6080; font-family: 'DM Mono', monospace; }

        /* Model picker */
        .model-picker { position: relative; }
        .model-btn {
          display: flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: #c8c0e0; font-family: 'DM Mono', monospace; font-size: 12px;
          padding: 6px 12px; border-radius: 8px; cursor: pointer;
          transition: all 0.15s; white-space: nowrap;
        }
        .model-btn:hover { background: rgba(184,169,255,0.12); border-color: rgba(184,169,255,0.3); color: #e8e0ff; }
        .model-dot { width: 6px; height: 6px; border-radius: 50%; background: #7fff9a; flex-shrink: 0; }
        .model-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0; min-width: 280px;
          background: #0e0e1c; border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.6);
          z-index: 200; max-height: 360px; overflow-y: auto;
        }
        .model-dropdown-label {
          padding: 10px 14px 6px; font-family: 'DM Mono', monospace;
          font-size: 10px; color: #6b6080; letter-spacing: 0.1em;
        }
        .model-option {
          display: flex; flex-direction: column; gap: 2px; padding: 10px 14px;
          background: transparent; border: none; cursor: pointer; text-align: left;
          width: 100%; transition: background 0.1s; border-top: 1px solid rgba(255,255,255,0.04);
        }
        .model-option:hover { background: rgba(184,169,255,0.08); }
        .model-option.active { background: rgba(184,169,255,0.13); }
        .model-option-name { font-size: 13px; color: #e8e0ff; font-weight: 600; }
        .model-option-desc { font-size: 11px; color: #6b6080; font-family: 'DM Mono', monospace; }

        .api-badge {
          font-family: 'DM Mono', monospace; font-size: 11px; color: #7fff9a;
          border: 1px solid rgba(127,255,154,0.25); padding: 5px 10px;
          border-radius: 6px; text-decoration: none; transition: all 0.15s; white-space: nowrap;
        }
        .api-badge:hover { background: rgba(127,255,154,0.1); border-color: #7fff9a; }

        /* Chat */
        .chat { flex: 1; overflow-y: auto; padding: 24px 20px; display: flex; flex-direction: column; gap: 20px; }
        .chat::-webkit-scrollbar { width: 4px; }
        .chat::-webkit-scrollbar-track { background: transparent; }
        .chat::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

        /* Empty state */
        .empty { display: flex; flex-direction: column; align-items: center; justify-content: center;
          flex: 1; gap: 12px; text-align: center; padding: 40px 20px; }
        .empty-glyph { font-size: 48px; color: #b8a9ff; opacity: 0.4; line-height: 1; margin-bottom: 4px; }
        .empty-title { font-size: 28px; font-weight: 800; letter-spacing: -0.04em; color: #f0ecff; }
        .empty-sub { font-family: 'DM Mono', monospace; font-size: 12px; color: #6b6080; }
        .suggestions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 16px; }
        .suggestion {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
          color: #a090c0; font-family: 'DM Mono', monospace; font-size: 11px;
          padding: 8px 14px; border-radius: 20px; cursor: pointer; transition: all 0.15s;
        }
        .suggestion:hover { background: rgba(184,169,255,0.1); border-color: rgba(184,169,255,0.3); color: #d0c8f0; }

        /* Messages */
        .msg { display: flex; flex-direction: column; gap: 5px; animation: fadeUp 0.25s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .msg-user { align-items: flex-end; }
        .msg-ai { align-items: flex-start; }
        .msg-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.12em; color: #4a4060; padding: 0 4px; }
        .msg-bubble {
          max-width: min(85%, 600px); padding: 13px 16px; border-radius: 14px;
          line-height: 1.65; font-size: 14px;
        }
        .msg-user .msg-bubble { background: #2a1f4a; border: 1px solid rgba(184,169,255,0.2); color: #e8e0ff; border-radius: 14px 14px 4px 14px; }
        .msg-ai .msg-bubble { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #d4cce8; border-radius: 4px 14px 14px 14px; }
        .msg-text { white-space: pre-wrap; word-break: break-word; font-family: 'DM Mono', monospace; font-size: 13px; line-height: 1.7; }
        .typing { font-family: 'DM Mono', monospace; font-size: 18px; color: #b8a9ff; display: inline-block; animation: blink 0.6s step-end infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        /* Footer */
        .footer {
          flex-shrink: 0; padding: 12px 20px 20px;
          border-top: 1px solid rgba(255,255,255,0.07);
          background: rgba(8,8,16,0.9); backdrop-filter: blur(12px);
        }
        .input-row { display: flex; gap: 10px; align-items: flex-end; }
        .input {
          flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 12px 16px; color: #e8e4f0;
          font-family: 'DM Mono', monospace; font-size: 13px; resize: none; outline: none;
          transition: border-color 0.2s; line-height: 1.5; max-height: 140px; overflow-y: auto;
        }
        .input:focus { border-color: rgba(184,169,255,0.4); }
        .input::placeholder { color: #4a4060; }
        .send-btn {
          width: 44px; height: 44px; border-radius: 12px; border: none; cursor: pointer;
          background: #b8a9ff; color: #0e0818; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.15s;
        }
        .send-btn:hover:not(.disabled) { background: #cfc3ff; transform: scale(1.05); }
        .send-btn.disabled { background: rgba(255,255,255,0.08); color: #4a4060; cursor: not-allowed; transform: none; }
        .footer-note { font-family: 'DM Mono', monospace; font-size: 10px; color: #3a3050; margin-top: 8px; }
        .footer-note code { color: #5a4880; }

        @media (max-width: 600px) {
          .logo-sub { display: none; }
          .empty-title { font-size: 22px; }
          .msg-text { font-size: 12px; }
        }
      `}</style>
    </>
  );
}
