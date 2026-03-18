import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,

  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: ['@privacybydesign/yivi-core', '@privacybydesign/yivi-web'],
  },
  target: false,
});
