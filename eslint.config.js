import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // New in eslint-plugin-react-hooks v7 — flags the reset-dialog-state-on-open
      // pattern used throughout the app. Kept visible as warnings, not errors.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  {
    // shadcn/ui files export variants/hooks alongside components by design;
    // AuthContext exports the context object. Only affects HMR granularity.
    files: ['src/components/ui/**', 'src/auth/AuthContext.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
