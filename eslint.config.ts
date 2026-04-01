import eslintReact from '@eslint-react/eslint-plugin';
import eslintJs from '@eslint/js';
import { defineConfig } from 'eslint/config';
import path from 'path';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url'; // 1. Import this

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    files: ['src/**/*.ts', 'src/**/*.d.ts', 'src/main.tsx'],

    // Extend recommended rule sets from:
    // 1. ESLint JS's recommended rules
    // 2. TypeScript ESLint recommended rules
    // 3. ESLint React's recommended-typescript rules
    extends: [
        eslintJs.configs.recommended,
        tseslint.configs.recommended,
        eslintReact.configs['recommended-typescript'],
    ],

    // Configure language/parsing options
    languageOptions: {
        // Use TypeScript ESLint parser for TypeScript files
        parser: tseslint.parser,
        parserOptions: {
            // Enable project service for better TypeScript integration
            projectService: true,
            tsconfigRootDir: __dirname,
        },
    },

    // Custom rule overrides (modify rule levels or disable rules)
    rules: {
        '@eslint-react/no-missing-key': 'warn',
    },
});
