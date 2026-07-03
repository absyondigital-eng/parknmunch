/**
 * screenshot.mjs — Puppeteer screenshot helper for ParkNMunch
 *
 * Usage:
 *   node screenshot.mjs <url> [label]
 *
 * Screenshots are saved to ./temporary screenshots/screenshot-N.png
 * or ./temporary screenshots/screenshot-N-label.png
 * Files are never overwritten — N auto-increments.
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

const outDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function nextFilename() {
  const files = fs.readdirSync(outDir).filter(f => f.startsWith('screenshot-') && f.endsWith('.png'));
  let max = 0;
  for (const f of files) {
    const m = f.match(/^screenshot-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const n = max + 1;
  const suffix = label ? `-${label.replace(/[^a-z0-9_-]/gi, '-')}` : '';
  return path.join(outDir, `screenshot-${n}${suffix}.png`);
}

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe')
    : '',
].filter(Boolean);

function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    if (!p.includes('*') && fs.existsSync(p)) return p;
  }
  return null;
}

(async () => {
  const chromePath = findChrome();
  const launchOpts = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1440, height: 900 },
  };

  if (chromePath) {
    console.log(`[screenshot] Using Chrome at: ${chromePath}`);
    launchOpts.executablePath = chromePath;
  } else {
    console.log('[screenshot] System Chrome not found — using puppeteer bundled browser.');
  }

  let browser;
  try {
    browser = await puppeteer.launch(launchOpts);
  } catch (err) {
    console.log('[screenshot] Launch failed, trying channel:chrome ...');
    browser = await puppeteer.launch({ ...launchOpts, channel: 'chrome', executablePath: undefined });
  }

  const page = await browser.newPage();

  console.log(`[screenshot] Navigating to ${url} ...`);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

  await new Promise(r => setTimeout(r, 500));

  const outPath = nextFilename();
  await page.screenshot({ path: outPath, fullPage: true });

  await browser.close();

  console.log(`[screenshot] Saved: ${outPath}`);
})();
