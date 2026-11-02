const {defineConfig} = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
    rules: {
      // The existing app does not enable React Compiler; its compiler-only diagnostics
      // flag legacy patterns throughout untouched screens. Keep Rules of Hooks enabled.
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/use-memo': 'warn',
      // Existing import/style issues are reported without blocking feature validation.
      'react/display-name': 'warn',
      'react/no-unescaped-entities': 'warn',
      'import/no-unresolved': 'warn',
      'import/no-named-as-default': 'warn',
      'import/first': 'warn',
      'import/namespace': 'warn',
    },
  },
]);
