import js from '@eslint/js';
import react from 'eslint-plugin-react';

export default [
  {
    ignores: ['dist/**']
  },
  {
    files: ['src/**/*.{js,jsx}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        document: 'readonly',
        fetch: 'readonly',
        URL: 'readonly'
      },
    },
    plugins: {
      react
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      'react/jsx-uses-vars': 'error'
    }
  }
];

