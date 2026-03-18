import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    node: 'src/node.ts',
    web: 'src/web.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,

  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: ['@privacybydesign/yivi-core', 'prompt-sync', 'qrcode-terminal'],
  },
  target: false,
});
