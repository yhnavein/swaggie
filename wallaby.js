module.exports = () => ({
  files: [
    'test/chai-extensions.ts',
    'src/**/*.ts',
    'test/*.json',
    'test/*.yml',
    '!src/**/*.spec.ts'
  ],
  require: [],

  tests: ['src/**/*.spec.ts'],

  env: {
    type: 'node',
  },
  delays: {
    run: 1000
  },

  testFramework: 'mocha',
  autoDetect: false,

  setup: () => { require('./test/chai-extensions'); }
});
