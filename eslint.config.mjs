import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'dist_electron/**/*', 'node_modules/**/*', 'android/**/*', 'electron/**/*'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
