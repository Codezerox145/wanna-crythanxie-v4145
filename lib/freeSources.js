// Free, keyless public-data adapters. No paid API credentials required.
// Public endpoints can rate-limit or change; every call has a timeout and clear failure.
const https = require('https');

function getJson(url, timeoutMs = 9000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'WANNA-CRY-THANXIEE/20.1.0 (open-source bot)' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; if (body.length > 1_000_000) req.destroy(new Error('Response too large')); });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`Public source returned HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Public source returned invalid JSON')); }
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Public source timed out')));
    req.on('error', reject);
  });
}

async function translateFree(text, target = 'en') {
  const hosts = (process.env.LIBRETRANSLATE_URLS || 'https://translate.terraprint.co/translate,https://libretranslate.de/translate').split(',').map(x => x.trim()).filter(Boolean);
  for (const host of hosts) {
    try {
      const response = await new Promise((resolve, reject) => {
        const url = new URL(host); const payload = JSON.stringify({ q: text, source: 'auto', target, format: 'text' });
        const req = require('https').request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), 'User-Agent': 'WANNA-CRY-THANXIEE/20.1.0' }, timeout: 10000 }, res => { let body=''; res.on('data',c=>body+=c); res.on('end',()=>{ try { resolve({status:res.statusCode,data:JSON.parse(body)}); } catch(e){reject(e);} }); });
        req.on('error',reject); req.on('timeout',()=>req.destroy(new Error('timeout'))); req.write(payload); req.end();
      });
      if (response.status >= 200 && response.status < 300 && response.data.translatedText) return response.data.translatedText;
    } catch (_) {}
  }
  throw new Error('No public LibreTranslate instance is responding. Try again later or configure a self-hosted LibreTranslate URL.');
}

async function fetchFreeSource(kind, query) {
  if (kind === 'weather') {
    const geo = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
    const place = geo.results?.[0];
    if (!place) return ['No matching location found.'];
    const wx = await getJson(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&timezone=auto`);
    const c = wx.current || {};
    return [`Location: ${place.name}, ${place.country || ''}`, `Temperature: ${c.temperature_2m ?? 'N/A'}°C`, `Feels like: ${c.apparent_temperature ?? 'N/A'}°C`, `Humidity: ${c.relative_humidity_2m ?? 'N/A'}%`, `Wind: ${c.wind_speed_10m ?? 'N/A'} km/h`, `Precipitation: ${c.precipitation ?? 'N/A'} mm`, 'Source: Open-Meteo (free public weather data)'];
  }
  if (kind === 'wiki') {
    const search = await getJson(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1`);
    const item = search.query?.search?.[0];
    if (!item) return ['No matching Wikipedia article found.'];
    const page = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title.replace(/ /g, '_'))}`);
    return [page.title || item.title, (page.extract || 'No summary available.').slice(0, 2500), page.content_urls?.desktop?.page || 'Source: Wikipedia'];
  }
  throw new Error('Unknown free source');
}
module.exports = { fetchFreeSource, translateFree };
