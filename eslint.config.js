const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
  // Глобальные настройки для всего проекта (если нужны)
  {
    // Игнорируем JS файлы в src, node_modules, dist, build и миграции, а также конфиг Vite
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '*.config.js',
      'client/vite.config.ts',
      '**/migrations/*.js',
      '**/*.js',
    ],
  },
  // Настройки для всего TypeScript проекта
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true, // Используем tsconfig.json для более точного анализа
      },
      globals: {
        ...globals.es2021, // Общие ES2021 globals
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      // Можно добавить или переопределить правила здесь
    },
  },
  // Настройки для серверного кода (Node.js)
  {
    files: ['server/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Специфичные правила для сервера, если нужны
    },
  },
  // Настройки для клиентского кода (Браузер + React)
  {
    files: ['client/**/*.ts', 'client/**/*.tsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    settings: {
      // Настройки для React плагина
      react: {
        version: 'detect', // Автоматически определять версию React
      },
    },
    rules: {
      // Специфичные правила для клиента
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // Можно добавить/переопределить правила здесь
      'react/react-in-jsx-scope': 'off', // В новых версиях React это не нужно
      'react/prop-types': 'off', // Отключаем, т.к. используем TypeScript для типов
    },
  },
  // Конфигурация Prettier (должна идти ПОСЛЕДНЕЙ)
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': 'warn',
    },
  }
);
