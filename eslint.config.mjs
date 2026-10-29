import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: ['node_modules/', 'coverage/', 'dist/', 'playwright-report/', 'test-results/']
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      semi: ['error', 'always'],
      quotes: ['error', 'single']
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: { ...globals.jest, ...globals.node }
    }
  },
  {
    files: ['playwright.config.js', 'tests/globalSetup.js', 'tests/e2e/**/*.js', 'scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node
    }
  }
]);
