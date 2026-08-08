import { copyFile } from 'node:fs/promises';

await copyFile('dist/music-assistant-card.js', 'music-assistant-card.js');