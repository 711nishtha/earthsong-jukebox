import { chromium } from 'playwright-core';
const [,, url, out] = process.argv;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: out, width: '1600px', height: '900px', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('ok');
