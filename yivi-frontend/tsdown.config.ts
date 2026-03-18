import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  outputOptions: { exports: 'named' },
  sourcemap: true,
  clean: false, // Don't clean as we also have webpack output
  deps: {
    neverBundle: ['@privacybydesign/yivi-css'],
  },
  target: false,
});
