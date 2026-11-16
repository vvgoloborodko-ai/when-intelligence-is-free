import { readdir, mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

async function copyFileWhenAvailable(source, destination) {
  for (let attempt = 0; ; attempt++) {
    try { await copyFile(source, destination); return; }
    catch (error) {
      if (!['EPERM', 'EBUSY'].includes(error.code) || attempt >= 4) throw error;
      await delay(100 * (attempt + 1));
    }
  }
}

// Static outputs need file contents, not source permission metadata. In
// particular, fs.cp's post-copy chmod intermittently fails on Windows hosts.
export async function copyOutput(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name), to = join(destination, entry.name);
    if (entry.isDirectory()) await copyOutput(from, to);
    else if (entry.isFile()) await copyFileWhenAvailable(from, to);
    else throw new Error(`Unexpected non-file build output: ${from}`);
  }
}
