#!/usr/bin/env node
// tslint:disable: max-line-length

import program from 'commander';
import chalk from 'chalk';
import { runCodeGenerator } from './index';

const args: any = program
  // tslint:disable-next-line:no-var-requires
  .version(require('../package.json').version)
  .option(
    '-c, --config <path>',
    'The path to the configuration JSON file. You can do all the set up there instead of parameters in the CLI',
    String,
    process.env.CONFIG_SRC
  )
  .option(
    '-s, --src <url|path>',
    'The url or path to the Open API spec file',
    String,
    process.env.OPEN_API_SRC
  )
  .option(
    '-o, --out <filePath>',
    'The path to the file where the API would be generated',
    process.env.OPEN_API_OUT
  )
  .option(
    '-b, --baseUrl <string>',
    'Base URL that will be used as a default value in the clients. Default: ""'
  )
  .option('-t, --template <string>', 'Template used forgenerating API client. Default: "axios"')
  .option('--preferAny', 'Use "any" type instead of "unknown". Default: false')
  .option(
    '--servicePrefix <string>',
    'Prefix for service names. Useful when you have multiple APIs and you want to avoid name collisions. Default: ""'
  )
  .option(
    '--queryModels',
    'Generate models for query string instead list of parameters. Default: false'
  )
  .parse(process.argv);

runCodeGenerator(args).then(complete, error);

function complete(spec: ApiSpec) {
  process.exit(0);
}

function error(e) {
  const msg = e instanceof Error ? e.message : e;
  console.error(chalk.red(msg));
  process.exit(1);
}
