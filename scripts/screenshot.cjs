// Serves the repo root and captures desktop + phone screenshots at several scroll
// positions, for a visual check. Usage: node scripts/screenshot.cjs <out-dir>
// Needs playwright (npm i -D playwright, or a global install) and a Chromium.
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { extname, join, normalize } = require('node:path');
const { chromium } = require('playwright');
(async () => {

const out = process.argv[2] || 'shots';
const root = process.cwd();
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = normalize(join(root, p));
  try {
    const data = await readFile(file);
    const type = types[extname(file)] || 'application/octet-stream';
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1;
      res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${data.length}`, 'content-length': end - start + 1 });
      res.end(data.subarray(start, end + 1));
      return;
    }
    res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': data.length });
    res.end(data);
  } catch { res.writeHead(404); res.end('nope'); }
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const errors = [];
async function shoot(name, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${name}] console: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[${name}] pageerror: ${e.message}`));
  page.on('requestfailed', r => { const t = r.failure() && r.failure().errorText; if (t !== 'net::ERR_ABORTED') errors.push(`[${name}] failed: ${r.url()} (${t})`); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const heroH = await page.evaluate(() => document.getElementById('hero').offsetHeight);
  const stops = [0, Math.round(heroH * 0.45), Math.round(heroH * 0.7), Math.round(heroH * 0.92), heroH];
  for (let y = heroH + viewport.height; y < total; y += viewport.height) stops.push(y);
  for (let i = 0; i < stops.length; i++) {
    await page.evaluate(y => window.scrollTo(0, y), stops[i]);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${name}-${String(i).padStart(2, '0')}.png` });
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) errors.push(`[${name}] horizontal overflow: ${await page.evaluate(() => document.documentElement.scrollWidth)} > ${viewport.width}`);
  await ctx.close();
  return stops.length;
}
const n1 = await shoot('desktop', { width: 1440, height: 900 });
const n2 = await shoot('phone', { width: 390, height: 844 });
await browser.close();
server.close();
console.log(`desktop shots: ${n1}, phone shots: ${n2}`);
console.log(errors.length ? errors.join('\n') : 'no console errors, failed requests or overflow');
})();
