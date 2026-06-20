import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-config-next@16 ships the React-Compiler-era react-hooks rules
    // (purity / refs / set-state-in-effect) as *errors*. This codebase predates the
    // React Compiler and deliberately uses several patterns those rules flag:
    //   • live `Date.now()` reads during render for countdown timers / presence dots
    //   • a ref captured once on mount as an immutable snapshot (reveal animation)
    //   • a ref kept in sync with state to avoid stale closures in one-shot timers
    //   • `setState` inside a mount effect to read client-only values (localStorage,
    //     window) *after* hydration — the documented fix for this app's past
    //     hydration-mismatch bugs (see CLAUDE.md history #9, #10). Converting these to
    //     lazy initial state would reintroduce those SSR mismatches.
    // They are kept as warnings: still surfaced for review, but they don't block the
    // lint gate. Revisit (and fix at the source) if/when the React Compiler is adopted.
    rules: {
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      // Allow intentionally-unused bindings prefixed with `_` (e.g. `const { hand: _hand,
      // ...rest } = player` to strip a field from an object before serialising).
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
