import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: false, // Don't clean as we also have webpack output
  external: ['@privacybydesign/yivi-css'],
});
