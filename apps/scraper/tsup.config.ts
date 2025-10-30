import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  outDir: 'dist',
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  clean: true,
  dts: false,
  minify: false,
  splitting: false,
  shims: false,
  skipNodeModulesBundle: true,
});
