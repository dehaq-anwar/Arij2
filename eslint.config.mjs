import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // The jsx-a11y plugin is already registered by eslint-config-next; enable its full recommended rule set.
  { rules: jsxA11y.flatConfigs.recommended.rules },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'next-env.d.ts',
    'src/payload-types.ts',
    'src/migrations/**',
    'src/app/(payload)/**',
  ]),
])
