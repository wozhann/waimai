// Expo's Metro web export doesn't offer a head-injection hook without expo-router,
// so PWA tags are patched into dist/index.html after `expo export --platform web`.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const htmlPath = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/index.html');

const tags = [
  '<link rel="manifest" href="/manifest.json"/>',
  '<meta name="theme-color" content="#FF5A1F"/>',
  '<link rel="icon" type="image/png" href="/icons/icon-192.png"/>',
  '<link rel="apple-touch-icon" href="/icons/icon-180.png"/>',
  '<meta name="mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default"/>',
  '<meta name="apple-mobile-web-app-title" content="外卖比价"/>',
].join('');

const html = readFileSync(htmlPath, 'utf8');
if (html.includes('rel="manifest"')) {
  console.log('PWA tags already present, skipping.');
} else {
  writeFileSync(htmlPath, html.replace('</head>', `${tags}</head>`));
  console.log('Injected PWA tags into dist/index.html');
}
