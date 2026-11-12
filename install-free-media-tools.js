// Install the free yt-dlp standalone binary on Linux hosts (including Render).
// This script is best-effort: the bot still starts if GitHub is temporarily unavailable.
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');
if (process.platform !== 'linux') process.exit(0);
const dir = path.join(__dirname, '..', 'bin');
const dest = path.join(dir, 'yt-dlp');
fs.mkdirSync(dir, { recursive: true });
if (fs.existsSync(dest)) process.exit(0);
function download(url, redirects = 0) {
  if (redirects > 6) return Promise.reject(new Error('Too many download redirects'));
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if ([301,302,303,307,308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        return resolve(download(new URL(response.headers.location, url).toString(), redirects + 1));
      }
      if (response.statusCode !== 200) { response.resume(); return reject(new Error('yt-dlp download returned HTTP ' + response.statusCode)); }
      const temp = dest + '.tmp';
      const output = fs.createWriteStream(temp, { mode: 0o755 });
      response.pipe(output);
      output.on('finish', () => output.close(() => {
        try { fs.renameSync(temp, dest); fs.chmodSync(dest, 0o755); resolve(); }
        catch (error) { reject(error); }
      }));
      output.on('error', reject);
    }).on('error', reject);
  });
}
download('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux')
  .then(() => console.log('[media] free yt-dlp binary installed'))
  .catch(error => console.warn('[media] yt-dlp install skipped:', error.message));
