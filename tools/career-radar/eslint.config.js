import js from '@eslint/js';

export default [
  { ignores: ['node_modules/**', 'public-env.js'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly', URL: 'readonly', crypto: 'readonly',
        console: 'readonly', Buffer: 'readonly', Response: 'readonly',
        Request: 'readonly', Headers: 'readonly', setTimeout: 'readonly', atob: 'readonly'
      }
    }
  }
];
