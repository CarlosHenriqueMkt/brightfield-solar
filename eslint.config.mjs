import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['.next/**', 'out/**', 'coverage/**', 'next-env.d.ts']),
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      nextPlugin.configs['core-web-vitals'],
      reactHooks.configs.flat.recommended,
    ],
  },
  prettier,
]);
