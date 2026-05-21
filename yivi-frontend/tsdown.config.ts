import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  platform: 'browser',
  // platform: 'browser' defaults fixedExtension to false (outputs .js/.cjs);
  // keep it true so we stay compatible with the existing .mjs/.cjs exports map.
  fixedExtension: true,
  sourcemap: true,
  clean: false, // Don't clean as we also have webpack output
  deps: {
    neverBundle: ['@privacybydesign/yivi-css'],
  },
  target: false,
});
