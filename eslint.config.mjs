import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'android-companion/**/*'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
