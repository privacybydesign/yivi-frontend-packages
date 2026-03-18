import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  outputOptions: { exports: 'named' },
  sourcemap: true,
  clean: true,
  target: false,
});
