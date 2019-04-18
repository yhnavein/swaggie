#!/usr/bin/env node

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
    '-o, --outDir <dir>',
    'The path to the directory where files should be generated',
    process.env.OPEN_API_OUT
  )
  .option(
    '--redux',
    'True if wanting to generate redux action creators',
    process.env.OPEN_API_REDUX
  )
  .option(
    '--semicolon',
    'True if wanting to use a semicolon statement terminator',
    process.env.OPEN_API_SEMICOLON
  )
  .option(
    '-b, --baseUrl <string>',
    'Base URL that will be used as a default value in the clients. Default: ""'
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
