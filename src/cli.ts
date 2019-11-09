#!/usr/bin/env node
// tslint:disable: max-line-length

import * as program from 'commander';
import chalk from 'chalk';
import { genCode } from './index';

const args: any = program
  // tslint:disable-next-line:no-var-requires
  .version(require('../package.json').version)
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
  .option(
    '-r, --reactHooks',
    'Generate additional context that can be consumed in your application more easily. Requires React Hooks. Default: false'
  )
  .option(
    '--preferAny',
    'Use "any" type instead of "unknown". Default: false'
  )
  .parse(process.argv);

genCode(args).then(complete, error);

function complete(spec: ApiSpec) {
  console.info(chalk.bold.cyan(`Api ${args.src} code generated into ${args.outDir}`));
  process.exit(0);
}

function error(e) {
  const msg = e instanceof Error ? e.message : e;
  console.error(chalk.red(msg));
  process.exit(1);
}
