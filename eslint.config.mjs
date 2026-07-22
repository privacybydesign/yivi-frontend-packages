import neostandard from 'neostandard';
import compat from 'eslint-plugin-compat';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

// Flat-config port of the old .eslintrc.json. neostandard is the flat-config
// successor to the (unmaintained) eslint-config-standard; `noStyle` leaves all
// formatting to Prettier, matching the previous `prettier-standard` extend.

// Mirror the old `env: { node: false }` / `browser: false` overrides: flat config
// has no `env`, so environment globals are toggled off explicitly per file group.
const nodeGlobalsOff = Object.fromEntries(Object.keys(globals.node).map((key) => [key, 'off']));
const browserGlobalsOff = Object.fromEntries(Object.keys(globals.browser).map((key) => [key, 'off']));

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/public/**',
      '**/webpack.config.*',
      'docs/styleguide/**',
      'coverage/**',
      '**/*.d.ts',
    ],
  },
  ...neostandard({ ts: true, noStyle: true }),
  compat.configs['flat/recommended'],
  prettierRecommended,
  {
    // Shared config: mirrors the old top-level env (browser + node + commonjs + es2021),
    // settings and custom rule set.
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.commonjs },
    },
    settings: {
      polyfills: ['Promise'],
    },
    rules: {
      'block-scoped-var': 'error',
      'consistent-return': 'error',
      'no-implicit-globals': 'error',
      'no-promise-executor-return': 'error',
      'no-script-url': 'error',
      'no-shadow': ['error', { builtinGlobals: true }],
      'no-unsafe-optional-chaining': 'error',
      'no-var': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'prettier/prettier': ['error', { singleQuote: true, printWidth: 120 }],
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { ecmaVersion: 2021, sourceType: 'module' },
    },
    rules: {
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': [
        'error',
        { builtinGlobals: true, ignoreTypeValueShadow: true, allow: ['event', 'EventSource', 'exports'] },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      'new-cap': 'off',
    },
  },
  {
    // Browser-only source must not see Node globals (mirrors `env: { node: false }`).
    files: ['plugins/yivi-web/**/*.ts', 'plugins/yivi-popup/**/*.ts', 'yivi-frontend/**/*.ts'],
    languageOptions: { globals: nodeGlobalsOff },
  },
  {
    // The Node entry point must not see browser globals (mirrors `env: { browser: false }`).
    files: ['plugins/yivi-console/src/node.ts'],
    languageOptions: { globals: browserGlobalsOff },
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Build/config tooling runs in Node, not the browser: give it Node globals and
    // skip the browser-compat check (mirrors the old .eslintignore for webpack.config.js).
    files: ['**/*.config.*'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'compat/compat': 'off' },
  },
];
