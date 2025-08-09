module.exports = () => ({
  autoDetect: ['node:test'],

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
    runner: 'node'
  },
  delays: {
    run: 1000
  },

  autoDetect: false,
});
