import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('frontend/dist', { recursive: true });
await build({
  entryPoints: ['frontend/src/main.js'],
  bundle: true,
  alias: { vue: 'vue/dist/vue.esm.js' },
  minify: true,
  sourcemap: true,
  outfile: 'frontend/dist/app.js',
  loader: { '.woff': 'file', '.woff2': 'file', '.ttf': 'file', '.eot': 'file' },
  assetNames: 'assets/[name]-[hash]',
  define: { 'process.env.NODE_ENV': '"production"' }
});
await copyFile('frontend/index.html', 'frontend/dist/index.html');
