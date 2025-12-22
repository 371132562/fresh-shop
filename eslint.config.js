import js from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'

// 根目录配置：仅处理根目录的 JS 配置文件，不涉及 TypeScript
export default [
  { ignores: ['dist', 'frontend/**', 'backend/**', 'node_modules/**'] },
  eslintPluginPrettierRecommended,
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      sourceType: 'module'
    }
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'linebreak-style': ['error', 'unix']
    }
  }
]
