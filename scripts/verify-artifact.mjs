import { readFile } from 'node:fs/promises';

const [built, root] = await Promise.all([
  readFile('dist/music-assistant-card.js'),
  readFile('music-assistant-card.js'),
]);

if (!built.equals(root)) {
  throw new Error('The root HACS artifact does not match dist/music-assistant-card.js.');
}

console.log('Verified root HACS artifact matches the production build.');