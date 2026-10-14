import js from '@eslint/js';

export default [
  { ignores: ['node_modules/**', 'public-env.js', 'vendor/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly', URL: 'readonly', crypto: 'readonly',
        console: 'readonly', Buffer: 'readonly', Response: 'readonly', fetch: 'readonly',
        Request: 'readonly', Headers: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', atob: 'readonly',
        TextDecoder: 'readonly', TextEncoder: 'readonly', AbortController: 'readonly', ReadableStream: 'readonly',
        document: 'readonly', window: 'readonly', localStorage: 'readonly',
        Element: 'readonly', HTMLInputElement: 'readonly', FormData: 'readonly'
      }
    }
  }
];
