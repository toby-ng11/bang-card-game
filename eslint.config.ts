import eslintReact from '@eslint-react/eslint-plugin';
import eslintJs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig({
    files: ['src/**/*.ts', 'src/**/*.d.ts', 'src/**/*.tsx'],

    // Extend recommended rule sets from:
    // 1. ESLint JS's recommended rules
    // 2. TypeScript ESLint recommended rules
    // 3. ESLint React's recommended-typescript rules
    extends: [
        eslintJs.configs.recommended,
        tseslint.configs.recommended,
        eslintReact.configs['recommended-typescript'],
        eslintConfigPrettier,
    ],

    // Configure language/parsing options
    languageOptions: {
        // Use TypeScript ESLint parser for TypeScript files
        parser: tseslint.parser,
        parserOptions: {
            // Enable project service for better TypeScript integration
            projectService: true,
        },
    },
    ignores: [
        'vendor',
        'node_modules',
        'public',
        'bootstrap/ssr',
        'tailwind.config.js',
    ],

    // Custom rule overrides (modify rule levels or disable rules)
    rules: {
        '@eslint-react/no-missing-key': 'warn',
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'react/no-unescaped-entities': 'off',
    },
});
