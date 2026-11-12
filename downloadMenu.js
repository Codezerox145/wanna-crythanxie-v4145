// commands/downloadMenu.js
// No paid APIs. These shell out to the free, open-source `yt-dlp` binary,
// which covers YouTube/TikTok/Facebook/Instagram/Twitter without any key.
// The bot HOST must have yt-dlp installed (see README "Download tools").
// If it's missing, commands say so honestly instead of pretending to work.

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { brandedReply, usageGuide } = require('../lib/brand');

const TMP = path.join(__dirname, '..', 'media', 'temp');
const YT_DLP = process.env.YT_DLP_PATH || (fs.existsSync(path.join(__dirname, '..', 'bin', 'yt-dlp')) ? path.join(__dirname, '..', 'bin', 'yt-dlp') : 'yt-dlp');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

function ytDlpAvailable() {
  try {
    require('child_process').execFileSync(YT_DLP, ['--version'], { stdio: 'ignore', timeout: 10000 });
    return true;
  } catch (_) {
    return false;
  }
}

function downloadWith(url, extraArgs, outTemplate) {
  return new Promise((resolve, reject) => {
    const args = [...extraArgs];
    try {
      const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
      if (ffmpegPath) args.push('--ffmpeg-location', ffmpegPath);
    } catch (_) {}
    execFile(YT_DLP, [...args, '-o', outTemplate, url], { timeout: 120000 }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function notInstalledCard() {
  return brandedReply('DOWNLOAD TOOL NOT INSTALLED', [
    'This bot host does not have yt-dlp installed.',
    'The server image was built without the yt-dlp binary. Check the deployment build log or install the official release from github.com/yt-dlp/yt-dlp.',
    'No paid API is used for downloads by design.'
  ]);
}

function downloadCommand(name, isAudio) {
  return {
    category: 'download',
    usage: `.${name} <url>`,
    example: `.${name} https://...`,
    async run(ctx) {
      const url = ctx.args[0];
      if (!url) return usageGuide(name, `.${name} <url>`, `.${name} https://...`);
      if (!ytDlpAvailable()) return notInstalledCard();
      const id = Date.now();
      const outTemplate = path.join(TMP, `${id}.%(ext)s`);
      try {
        const args = isAudio ? ['-x', '--audio-format', 'mp3'] : ['-f', 'mp4'];
        await downloadWith(url, args, outTemplate);
        const files = fs.readdirSync(TMP).filter((f) => f.startsWith(`${id}.`));
        if (!files.length) throw new Error('No output file produced');
        const full = path.join(TMP, files[0]);
        const buf = fs.readFileSync(full);
        fs.unlinkSync(full);
        return isAudio ? { audio: buf } : { video: buf };
      } catch (e) {
        return brandedReply('DOWNLOAD FAILED', [`Could not fetch that link: ${e.message.slice(0, 150)}`, 'Check the URL is public and supported.']);
      }
    }
  };
}

const commands = {
  play: downloadCommand('play', true),
  song: downloadCommand('song', true),
  ytmp3: downloadCommand('ytmp3', true),
  ytmp4: downloadCommand('ytmp4', false),
  video: downloadCommand('video', false),
  tiktok: downloadCommand('tiktok', false),
  facebook: downloadCommand('facebook', false),
  instagram: downloadCommand('instagram', false),
  twitter: downloadCommand('twitter', false),
  apk: {
    category: 'download', usage: '.apk <app name>', example: '.apk whatsapp',
    async run() {
      return brandedReply('NOT WIRED UP', ['APK search/download needs a third-party store API — not wired in this build to avoid unverified/unsafe APK sources.']);
    }
  },
  mediafire: downloadCommand('mediafire', false)
};

module.exports = commands;
