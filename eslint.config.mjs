import tseslint from 'typescript-eslint'
import globals from 'globals'

export default [
  { ignores: ['dist/**', 'node_modules/**', '**/*.{js,cjs,mjs,jsx}'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: globals.browser }
  },
  {
    files: ['electron/**/*.ts', 'vite*.config.ts', '**/*.{config,conf}.ts'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: globals.node }
  },
  {
    rules: {
      'semi': ["error", "always"],
      "quotes": ["error", "double"],
      'no-console': 'off',
      'no-debugger': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  }
]
