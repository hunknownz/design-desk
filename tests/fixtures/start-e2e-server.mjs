import { promises as fs } from 'node:fs';
import path from 'node:path';

const target = process.env.DESIGN_DESK_DATA_FILE;
if (!target) throw new Error('DESIGN_DESK_DATA_FILE is required');
await fs.mkdir(path.dirname(target), { recursive: true });
await fs.copyFile(new URL('../../data/project.json', import.meta.url), target);
await import('../../server.mjs');
