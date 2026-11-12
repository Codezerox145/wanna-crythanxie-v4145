// lib/gemini.js
require('dotenv').config();
const fetch = global.fetch;

const MODEL = 'gemini-2.0-flash';
const ENDPOINT = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

/**
 * Sends a prompt to Gemini and returns plain text. Throws on failure so
 * callers can show a branded "AI unavailable" card instead of crashing.
 */
async function askGemini(prompt, systemInstruction) {
  // Prefer a locally hosted Ollama model: open-source, keyless, no paid API.
  const ollamaUrl = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ model: ollamaModel, stream: false, messages: [
        ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
        { role: 'user', content: prompt }
      ] })
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const answer = data?.message?.content?.trim();
      if (answer) return answer;
    }
  } catch (_) { /* local model unavailable; optional free/public fallback below */ }

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('No local Ollama model is reachable. Install Ollama and pull a model, or configure an optional API key.');
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
  const res = await fetch(ENDPOINT(key), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Optional AI endpoint error ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) throw new Error('AI returned an empty response');
  return text.trim();
}

const PRESETS = {
  chat: null,
  explain: 'Explain the following clearly and simply, as if to a beginner.',
  rewrite: 'Rewrite the following text to be clearer and more polished, keeping the original meaning.',
  essay: 'Write a well-structured essay on the following topic.',
  brainstorm: 'Brainstorm a creative list of ideas for the following prompt.',
  math: 'Solve the following math problem, showing the key steps.',
  codeai: 'You are a helpful coding assistant. Answer the following coding question or request with working code and a brief explanation.',
  summarize: 'Summarize the following text concisely, keeping the key points.',
  translate: 'Translate the following text. If no target language is specified, translate to English.'
};

module.exports = { askGemini, PRESETS };
