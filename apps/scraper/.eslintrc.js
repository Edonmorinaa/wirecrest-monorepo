module.exports = {
  env: {
    node: true,
    es2020: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'off', // Disable for TypeScript files since TS handles this
    'no-console': 'off',
    'no-undef': 'off' // Disable for TypeScript files
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js']
};
