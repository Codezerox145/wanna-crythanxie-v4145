// commands/stickerMedia.js
// Media tools wired with LOCAL processing only (sharp + ffmpeg) — no paid
// third-party APIs, as requested. Each command downloads the quoted media
// via Baileys' own downloadMediaMessage, processes it locally, replies.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
let ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
try { ffmpegPath = require('@ffmpeg-installer/ffmpeg').path; } catch (_) {}
ffmpeg.setFfmpegPath(ffmpegPath);
const { brandedReply, usageGuide } = require('../lib/brand');

const TMP = path.join(__dirname, '..', 'media', 'temp');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

async function getQuotedBuffer(ctx) {
  if (!ctx.quotedMsgFull) return null;
  try {
    const { downloadMediaMessage } = require('@whiskeysockets/baileys');
    return await downloadMediaMessage(ctx.quotedMsgFull, 'buffer', {});
  } catch (_) {
    return null;
  }
}

function ffmpegPromise(cmd) {
  return new Promise((resolve, reject) => {
    cmd.on('end', resolve).on('error', reject).run();
  });
}

const commands = {
  sticker: {
    category: 'sticker', usage: '.sticker (reply to image/video)', example: '.sticker',
    async run(ctx) {
      const buf = await getQuotedBuffer(ctx);
      if (!buf) return usageGuide('sticker', '.sticker (reply to an image or short video)', '.sticker');
      try {
        const isVideo = ctx.quotedMsgFull?.message?.videoMessage;
        const inPath = path.join(TMP, `in_${Date.now()}`);
        const outPath = path.join(TMP, `out_${Date.now()}.webp`);
        fs.writeFileSync(inPath, buf);
        if (isVideo) {
          await ffmpegPromise(
            ffmpeg(inPath).outputOptions(['-vcodec libwebp', '-vf scale=512:512:force_original_aspect_ratio=decrease,fps=10', '-loop 0', '-ss 0', '-t 5']).save(outPath)
          );
        } else {
          await sharp(buf).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp().toFile(outPath);
        }
        const webpBuf = fs.readFileSync(outPath);
        fs.unlinkSync(inPath); fs.unlinkSync(outPath);
        return { sticker: webpBuf };
      } catch (e) {
        return brandedReply('STICKER FAILED', [`Could not process media: ${e.message}`]);
      }
    }
  },
  toimg: {
    category: 'sticker', usage: '.toimg (reply to a sticker)', example: '.toimg',
    async run(ctx) {
      const buf = await getQuotedBuffer(ctx);
      if (!buf) return usageGuide('toimg', '.toimg (reply to a sticker)', '.toimg');
      try {
        const out = await sharp(buf).png().toBuffer();
        return { image: out };
      } catch (e) {
        return brandedReply('CONVERT FAILED', [`${e.message}`]);
      }
    }
  },
  crop: {
    category: 'sticker', usage: '.crop (reply to image) <w> <h>', example: '.crop 300 300',
    async run(ctx) {
      const buf = await getQuotedBuffer(ctx);
      if (!buf) return usageGuide('crop', '.crop (reply to image) <w> <h>', '.crop 300 300');
      const w = parseInt(ctx.args[0], 10) || 300;
      const h = parseInt(ctx.args[1], 10) || 300;
      const out = await sharp(buf).resize(w, h, { fit: 'cover' }).toBuffer();
      return { image: out };
    }
  },
  circle: {
    category: 'sticker', usage: '.circle (reply to image)', example: '.circle',
    async run(ctx) {
      const buf = await getQuotedBuffer(ctx);
      if (!buf) return usageGuide('circle', '.circle (reply to image)', '.circle');
      const size = 512;
      const circleSvg = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#fff"/></svg>`);
      const resized = await sharp(buf).resize(size, size, { fit: 'cover' }).toBuffer();
      const out = await sharp(resized).composite([{ input: circleSvg, blend: 'dest-in' }]).png().toBuffer();
      return { image: out };
    }
  },
  removebg: {
    category: 'sticker', usage: '.removebg (reply to image)', example: '.removebg',
    async run(ctx) {
      const buf = await getQuotedBuffer(ctx);
      if (!buf) return usageGuide('removebg', '.removebg (reply to image)', '.removebg');
      const inPath = path.join(TMP, `bg_in_${Date.now()}.png`);
      const outPath = path.join(TMP, `bg_out_${Date.now()}.png`);
      try {
        fs.writeFileSync(inPath, buf);
        await new Promise((resolve, reject) => require('child_process').execFile(process.env.REMBG_PATH || 'rembg', ['i', inPath, outPath], { timeout: 90000 }, (err) => err ? reject(err) : resolve()));
        return { image: fs.readFileSync(outPath) };
      } catch (_) {
        return brandedReply('LOCAL MODEL REQUIRED', ['Install the open-source rembg package on the host: pip install rembg[cpu]', 'No paid background-removal API is used.']);
      } finally { try { fs.unlinkSync(inPath); } catch (_) {} try { fs.unlinkSync(outPath); } catch (_) {} }
    }
  },
  hd: {
    category: 'sticker', usage: '.hd (reply to image)', example: '.hd',
    async run(ctx) {
      const buf = await getQuotedBuffer(ctx);
      if (!buf) return usageGuide('hd', '.hd (reply to image)', '.hd');
      const out = await sharp(buf).resize({ width: 1600, withoutEnlargement: false }).sharpen().toBuffer();
      return { image: out };
    }
  },
  enhance: {
    category: 'sticker', usage: '.enhance (reply to image)', example: '.enhance',
    async run(ctx) {
      const buf = await getQuotedBuffer(ctx);
      if (!buf) return usageGuide('enhance', '.enhance (reply to image)', '.enhance');
      const out = await sharp(buf).sharpen().modulate({ brightness: 1.05, saturation: 1.1 }).toBuffer();
      return { image: out };
    }
  },
  blur: {
    category: 'sticker', usage: '.blur (reply to image)', example: '.blur',
    async run(ctx) {
      const buf = await getQuotedBuffer(ctx);
      if (!buf) return usageGuide('blur', '.blur (reply to image)', '.blur');
      const out = await sharp(buf).blur(12).toBuffer();
      return { image: out };
    }
  },
  resize: {
    category: 'sticker', usage: '.resize <w> <h> (reply to image)', example: '.resize 500 500',
    async run(ctx) {
      const buf = await getQuotedBuffer(ctx);
      if (!buf) return usageGuide('resize', '.resize <w> <h> (reply to image)', '.resize 500 500');
      const w = parseInt(ctx.args[0], 10), h = parseInt(ctx.args[1], 10);
      if (!w || !h) return usageGuide('resize', '.resize <w> <h>', '.resize 500 500');
      const out = await sharp(buf).resize(w, h).toBuffer();
      return { image: out };
    }
  },
  compress: {
    category: 'sticker', usage: '.compress (reply to image)', example: '.compress',
    async run(ctx) {
      const buf = await getQuotedBuffer(ctx);
      if (!buf) return usageGuide('compress', '.compress (reply to image)', '.compress');
      const out = await sharp(buf).jpeg({ quality: 40 }).toBuffer();
      return { image: out };
    }
  },
  toaudio: {
    category: 'sticker', usage: '.toaudio (reply to video)', example: '.toaudio',
    async run(ctx) {
      const buf = await getQuotedBuffer(ctx);
      if (!buf) return usageGuide('toaudio', '.toaudio (reply to video)', '.toaudio');
      const inPath = path.join(TMP, `in_${Date.now()}.mp4`);
      const outPath = path.join(TMP, `out_${Date.now()}.mp3`);
      fs.writeFileSync(inPath, buf);
      await ffmpegPromise(ffmpeg(inPath).noVideo().audioCodec('libmp3lame').save(outPath));
      const out = fs.readFileSync(outPath);
      fs.unlinkSync(inPath); fs.unlinkSync(outPath);
      return { audio: out };
    }
  },
  reverse: {
    category: 'sticker', usage: '.reverse (reply to video)', example: '.reverse',
    async run(ctx) {
      const buf = await getQuotedBuffer(ctx);
      if (!buf) return usageGuide('reverse', '.reverse (reply to video)', '.reverse');
      const inPath = path.join(TMP, `in_${Date.now()}.mp4`);
      const outPath = path.join(TMP, `out_${Date.now()}.mp4`);
      fs.writeFileSync(inPath, buf);
      await ffmpegPromise(ffmpeg(inPath).videoFilters('reverse').audioFilters('areverse').save(outPath));
      const out = fs.readFileSync(outPath);
      fs.unlinkSync(inPath); fs.unlinkSync(outPath);
      return { video: out };
    }
  },
  speed: {
    category: 'sticker', usage: '.speed <0.5-2.0> (reply to video)', example: '.speed 1.5',
    async run(ctx) {
      const buf = await getQuotedBuffer(ctx);
      const factor = parseFloat(ctx.args[0]) || 1.5;
      if (!buf) return usageGuide('speed', '.speed <factor> (reply to video)', '.speed 1.5');
      const inPath = path.join(TMP, `in_${Date.now()}.mp4`);
      const outPath = path.join(TMP, `out_${Date.now()}.mp4`);
      fs.writeFileSync(inPath, buf);
      await ffmpegPromise(ffmpeg(inPath).videoFilters(`setpts=${1 / factor}*PTS`).save(outPath));
      const out = fs.readFileSync(outPath);
      fs.unlinkSync(inPath); fs.unlinkSync(outPath);
      return { video: out };
    }
  },
  tts: {
    category: 'tools', usage: '.tts <text>', example: '.tts hello world',
    async run(ctx) {
      const text = ctx.args.join(' ') || ctx.quotedText;
      if (!text) return usageGuide('tts', '.tts <text>', '.tts Hello there');
      const outPath = path.join(TMP, `tts_${Date.now()}.mp3`);
      try {
        await new Promise((resolve, reject) => require('child_process').execFile(process.env.ESPEAK_PATH || 'espeak-ng', ['-w', outPath, text.slice(0, 1200)], { timeout: 30000 }, (err) => err ? reject(err) : resolve()));
        return { audio: fs.readFileSync(outPath), mimetype: 'audio/wav', ptt: false };
      } catch (_) { return brandedReply('LOCAL TTS REQUIRED', ['Install the free open-source espeak-ng engine on the host.']); }
      finally { try { fs.unlinkSync(outPath); } catch (_) {} }
    }
  }
};

module.exports = commands;
