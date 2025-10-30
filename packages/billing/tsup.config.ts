import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server/index.ts', 'src/client/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  dts: true,
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  clean: true,
  splitting: false,
  shims: false,
  skipNodeModulesBundle: true,
  tsconfig: 'tsconfig.dts.json',
});
