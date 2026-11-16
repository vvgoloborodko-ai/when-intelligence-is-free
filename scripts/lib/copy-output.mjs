import { readdir, mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

// Static outputs need file contents, not source permission metadata. In
// particular, fs.cp's post-copy chmod intermittently fails on Windows hosts.
export async function copyOutput(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name), to = join(destination, entry.name);
    if (entry.isDirectory()) await copyOutput(from, to);
    else if (entry.isFile()) await copyFile(from, to);
    else throw new Error(`Unexpected non-file build output: ${from}`);
  }
}
