import * as esbuild from 'esbuild';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const root = new URL('.', import.meta.url).pathname;
const outdir = join(root, 'dist');
await mkdir(outdir, { recursive:true });
await esbuild.build({
  entryPoints: [join(root, 'src/main.js')],
  bundle: true,
  outfile: join(outdir, 'app.js'),
  platform: 'browser',
  format: 'iife',
  target: ['es2020'],
  minify: true,
  legalComments: 'inline',
});
for (const f of ['index.html','style.css','sw.js','manifest.webmanifest']) {
  await copyFile(join(root, 'public', f), join(outdir, f));
}
console.log('Built dist/ — all astronomical and timezone dependencies are included in app.js');
