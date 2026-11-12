// commands/toolsInfo.js
const { brandedReply, usageGuide } = require('../lib/brand');
const { askGemini } = require('../lib/gemini');
const { fetchFreeSource } = require('../lib/freeSources');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const TMP = path.join(__dirname, '..', 'media', 'temp');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
async function quotedImage(ctx) { if (!ctx.quotedMsgFull) return null; try { const { downloadMediaMessage } = require('@whiskeysockets/baileys'); return await downloadMediaMessage(ctx.quotedMsgFull, 'buffer', {}); } catch (_) { return null; } }

const commands = {
  jid: {
    category: 'tools', usage: '.jid', example: '.jid',
    async run(ctx) { return brandedReply('CHAT JID', [ctx.chatJid]); }
  },
  calc: {
    category: 'tools', usage: '.calc <expression>', example: '.calc 12*7+3',
    async run(ctx) {
      const expr = ctx.args.join(' ');
      if (!expr) return usageGuide('calc', '.calc <expression>', '.calc 12*7+3');
      if (!/^[0-9+\-*/().\s%]+$/.test(expr)) return brandedReply('INVALID EXPRESSION', ['Only numbers and + - * / ( ) % are allowed.']);
      try {
        // eslint-disable-next-line no-eval
        const result = Function(`"use strict"; return (${expr})`)();
        return brandedReply('CALCULATOR', [`${expr} = ${result}`]);
      } catch (e) {
        return brandedReply('CALCULATION FAILED', ['Could not evaluate that expression.']);
      }
    }
  },
  weather: {
    category: 'tools', usage: '.weather <city>', example: '.weather Harare',
    async run(ctx) { const place = ctx.args.join(' '); if (!place) return usageGuide('weather', '.weather <city>', '.weather Harare'); try { return brandedReply('WEATHER · OPEN-METEO', await fetchFreeSource('weather', place)); } catch (e) { return brandedReply('WEATHER UNAVAILABLE', [e.message]); } }
  },
  qr: {
    category: 'tools', usage: '.qr <text>', example: '.qr https://example.com',
    async run(ctx) {
      const text = ctx.args.join(' '); if (!text) return usageGuide('qr', '.qr <text>', '.qr https://example.com');
      const out = path.join(TMP, `qr_${Date.now()}.png`);
      try { await execFileAsync(process.env.QRENCODE_PATH || 'qrencode', ['-o', out, text], { timeout: 10000 }); const image = fs.readFileSync(out); fs.unlinkSync(out); return { image }; }
      catch (_) { return brandedReply('QR TOOL REQUIRED', ['Install the free open-source qrencode package on the bot host.']); }
    }
  },
  qrdecode: {
    category: 'tools', usage: '.qrdecode (reply to QR image)', example: '.qrdecode',
    async run(ctx) { const buf = await quotedImage(ctx); if (!buf) return usageGuide('qrdecode', '.qrdecode (reply to QR image)', '.qrdecode'); const file=path.join(TMP,`qr_in_${Date.now()}.png`); try { fs.writeFileSync(file,buf); const {stdout}=await execFileAsync(process.env.ZBARIMG_PATH||'zbarimg',['--quiet','--raw',file],{timeout:10000}); return brandedReply('QR DECODED',[stdout.trim()||'No QR code detected.']); } catch (_) { return brandedReply('QR DECODER REQUIRED',['Install the free open-source zbarimg package (zbar-tools).']); } finally { try{fs.unlinkSync(file);}catch(_){} } }
  },
  ocr: {
    category: 'tools', usage: '.ocr (reply to image)', example: '.ocr',
    async run(ctx) { const buf=await quotedImage(ctx); if(!buf)return usageGuide('ocr','.ocr (reply to image)','.ocr'); const file=path.join(TMP,`ocr_${Date.now()}.png`); try { fs.writeFileSync(file,buf); const {stdout}=await execFileAsync(process.env.TESSERACT_PATH||'tesseract',[file,'stdout'],{timeout:30000}); return brandedReply('OCR RESULT',[stdout.trim().slice(0,3500)||'No text detected.']); } catch (_) { return brandedReply('OCR ENGINE REQUIRED',['Install the free open-source Tesseract OCR engine on the bot host.']); } finally { try{fs.unlinkSync(file);}catch(_){} } }
  },
  shorturl: {
    category: 'tools', usage: '.shorturl <url>', example: '.shorturl https://example.com/very/long/path',
    async run(ctx) {
      const input = ctx.args[0]; if (!input || !/^https?:\/\//i.test(input)) return usageGuide('shorturl', '.shorturl <http(s) URL>', '.shorturl https://example.com');
      try { const response = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(input)}`); const result = await response.text(); if (!response.ok || !/^https?:\/\//i.test(result)) throw new Error('Public shortener rejected the URL'); return brandedReply('SHORT URL · IS.GD', [result]); }
      catch (e) { return brandedReply('SHORTENER UNAVAILABLE', [e.message]); }
    }
  },
  tempmail: {
    category: 'tools', usage: '.tempmail', example: '.tempmail',
    async run() { return brandedReply('NOT WIRED UP', ['Temp-mail needs a third-party API — not wired in this build.']); }
  },
  paste: {
    category: 'tools', usage: '.paste <text>', example: '.paste some long text to share',
    async run(ctx) {
      return brandedReply('NOT WIRED UP', ['Pastebin-style hosting needs a third-party API — not wired in this build.']);
    }
  },
  upload: {
    category: 'tools', usage: '.upload (reply to file)', example: '.upload',
    async run() { return brandedReply('NOT WIRED UP', ['Cloud upload needs storage credentials (S3/GDrive) — not wired in this build.']); }
  }
};

module.exports = commands;
