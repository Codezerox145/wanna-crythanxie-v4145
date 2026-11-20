// Shared AI provider and response presets for WANNA-CRY THANXIEE.
require('dotenv').config();
const fetch = global.fetch;

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ENDPOINT = key => `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

const CHAT_SYSTEM = [
  'You are the helpful AI assistant inside WANNA-CRY THANXIEE.',
  'Be accurate, practical, respectful and natural. Answer the user’s actual question first.',
  'Use concise, well-structured replies; expand when the task needs detail.',
  'Match the user’s language and level of technical knowledge.',
  'Use numbered steps for procedures and code blocks for code.',
  'Never invent facts, links, command results, account status, or actions you did not perform.',
  'If information is uncertain or unavailable, say so plainly and suggest a useful next step.',
  'Do not claim to have browsed, sent, saved, deployed, or changed anything unless a connected tool confirms it.',
  'Avoid unnecessary greetings, repeated conclusions, excessive emojis, and filler.'
].join(' ');

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function askOllama(prompt, systemInstruction) {
  const base = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  const timeout = withTimeout(Number(process.env.OLLAMA_TIMEOUT_MS) || 45000);
  try {
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: timeout.signal,
      body: JSON.stringify({
        model, stream: false,
        messages: [
          { role: 'system', content: systemInstruction || CHAT_SYSTEM },
          { role: 'user', content: String(prompt) }
        ]
      })
    });
    if (!res.ok) throw new Error(`Local AI returned HTTP ${res.status}`);
    const data = await res.json();
    const answer = data?.message?.content?.trim();
    if (!answer) throw new Error('Local AI returned an empty response');
    return answer;
  } finally {
    timeout.clear();
  }
}

async function askGemini(prompt, systemInstruction) {
  const userPrompt = String(prompt || '').trim();
  if (!userPrompt) throw new Error('Enter a question or prompt first.');
  if (userPrompt.length > 12000) throw new Error('Your prompt is too long. Please keep it under 12,000 characters.');
  const instruction = systemInstruction || CHAT_SYSTEM;

  // Try the configured local model first. If it is unavailable, use Gemini
  // only when an API key is configured; otherwise return a clear setup message.
  try {
    return await askOllama(userPrompt, instruction);
  } catch (localError) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      const error = new Error('AI is not configured. Set up Ollama with a model, or add GEMINI_API_KEY to the service environment.');
      error.code = 'AI_NOT_CONFIGURED';
      throw error;
    }

    const timeout = withTimeout(Number(process.env.GEMINI_TIMEOUT_MS) || 35000);
    try {
      const body = {
        systemInstruction: { parts: [{ text: instruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] },
        generationConfig: { temperature: 0.65, maxOutputTokens: 2048 }
      };
      const res = await fetch(ENDPOINT(key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: timeout.signal,
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const error = new Error(`AI provider returned HTTP ${res.status}.`);
        error.code = 'AI_PROVIDER_ERROR';
        throw error;
      }
      const data = await res.json();
      const answer = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
      if (!answer) throw new Error('AI provider returned an empty response.');
      return answer;
    } finally {
      timeout.clear();
    }
  }
}

const PRESETS = {
  chat: CHAT_SYSTEM,
  explain: `${CHAT_SYSTEM} Explain the topic in plain language, define unfamiliar terms and use a short example when helpful.`,
  rewrite: `${CHAT_SYSTEM} Rewrite the supplied text while preserving its meaning, facts and intent. Return only the improved version unless the user asks for notes.`,
  essay: `${CHAT_SYSTEM} Write a coherent, well-organized essay with an appropriate introduction, body and conclusion. Do not fabricate citations or sources.`,
  brainstorm: `${CHAT_SYSTEM} Generate varied, practical ideas. Group them when useful and identify the strongest options briefly.`,
  math: `${CHAT_SYSTEM} Solve carefully, show the essential steps and verify the result. State assumptions when the question is ambiguous.`,
  codeai: `${CHAT_SYSTEM} Act as a coding assistant. Provide working, secure code, mention assumptions and explain how to run or test it. Do not claim code was executed unless it was.`,
  summarize: `${CHAT_SYSTEM} Summarize the supplied content faithfully. Preserve key facts, decisions and caveats; do not add details absent from the source.`,
  translate: `${CHAT_SYSTEM} Translate accurately while preserving meaning, tone and formatting. Do not explain the translation unless asked.`
};

module.exports = { askGemini, PRESETS, CHAT_SYSTEM };
