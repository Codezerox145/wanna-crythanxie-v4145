// commands/aiSuite.js
const { brandedReply, usageGuide } = require('../lib/brand');
const { askGemini, PRESETS } = require('../lib/gemini');
const { translateFree } = require('../lib/freeSources');

function aiCommand(name, systemPreset, exampleSuffix) {
  return {
    category: 'ai',
    usage: `.${name} <prompt>`,
    example: `.${name} ${exampleSuffix}`,
    async run(ctx) {
      const prompt = ctx.args.join(' ') || ctx.quotedText;
      if (!prompt) return usageGuide(name, `.${name} <text>`, `.${name} ${exampleSuffix}`);
      try {
        const answer = await askGemini(prompt, systemPreset);
        return brandedReply(name.toUpperCase(), [answer]);
      } catch (e) {
        return brandedReply('AI UNAVAILABLE', [
          'Could not reach Gemini right now.',
          e.message.includes('GEMINI_API_KEY') ? 'Owner: set GEMINI_API_KEY in .env' : 'Please try again shortly.'
        ]);
      }
    }
  };
}

const commands = {
  ai: aiCommand('ai', PRESETS.chat, 'what is the capital of Zimbabwe?'),
  chat: aiCommand('chat', PRESETS.chat, 'how are you today?'),
  gpt: aiCommand('gpt', PRESETS.chat, 'tell me a fun fact'),
  askai: aiCommand('askai', PRESETS.chat, 'explain blockchain simply'),
  explain: aiCommand('explain', PRESETS.explain, 'quantum computing'),
  rewrite: aiCommand('rewrite', PRESETS.rewrite, 'pls send me the file asap thx'),
  essay: aiCommand('essay', PRESETS.essay, 'the importance of community'),
  brainstorm: aiCommand('brainstorm', PRESETS.brainstorm, 'group activity ideas'),
  math: aiCommand('math', PRESETS.math, '2x + 5 = 17, solve for x'),
  codeai: aiCommand('codeai', PRESETS.codeai, 'write a function to reverse a string in JS'),
  summarize: aiCommand('summarize', PRESETS.summarize, '(reply to a long message)'),
  translate: { category: 'ai', usage: '.translate <target language>: <text>', example: '.translate Spanish: good morning', async run(ctx) { const input = ctx.args.join(' ') || ctx.quotedText || ''; const match = input.match(/^([^:]{2,30}):\s*(.+)$/); if (!match) return usageGuide('translate', '.translate <language>: <text>', '.translate Spanish: good morning'); try { return brandedReply('TRANSLATION · LIBRETRANSLATE', [await translateFree(match[2], match[1].trim().toLowerCase())]); } catch (e) { return brandedReply('TRANSLATION UNAVAILABLE', [e.message]); } } },

  imageai: {
    category: 'ai', usage: '.imageai <prompt>', example: '.imageai a sunset over mountains',
    async run(ctx) {
      return brandedReply('IMAGE GENERATION', [
        'Image generation is not wired up yet — this build uses Gemini text generation only, no image-gen API key was requested.',
        'Ask the owner to wire an image model here if needed.'
      ]);
    }
  },
  imagine: {
    category: 'ai', usage: '.imagine <prompt>', example: '.imagine a futuristic city',
    async run(ctx) {
      return brandedReply('IMAGE GENERATION', ['Not wired up in this build — same as .imageai.']);
    }
  },

  smartreply: {
    category: 'ai', usage: '.smartreply on|off', example: '.smartreply on',
    async run(ctx) {
      if (!ctx.isOwner) return brandedReply('ACCESS DENIED', ['Owner only.']);
      const v = (ctx.args[0] || '').toLowerCase();
      const db = require('../lib/db');
      db.set('settings', 'smartreply', v === 'on');
      return brandedReply('SMART-REPLY', [`Smart-reply (AI auto-answers in DMs) is now ${v.toUpperCase()}.`]);
    }
  }
};

module.exports = commands;
