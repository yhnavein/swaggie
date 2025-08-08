module.exports = () => ({
  files: [
    'test/test.utils.ts',
    'src/**/*.ts',
    'test/*.json',
    'test/*.yml',
    'templates/**/*.ejs',
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
