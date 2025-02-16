#!/usr/bin/env node

import { bold, cyan, red } from 'nanocolors';
import { Command, Option } from 'commander';

import { type CodeGenResult, runCodeGenerator } from './index';
import type { FullAppOptions } from './types';

const arrayFormatOption = new Option(
  '--arrayFormat <format>',
  'Determines how arrays should be serialized'
).choices(['indices', 'repeat', 'brackets']);

const program = new Command();
program
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
    'The path to the file where the API would be generated. Use stdout if left empty',
    process.env.OPEN_API_OUT
  )
  .option('-b, --baseUrl <string>', 'Base URL that will be used as a default value in the clients')
  .option(
    '-t, --template <string>',
    'Template used forgenerating API client. Default: "axios". Other: "fetch", "ng1", "ng2", "swr-axios", "xior", "tsq-xior"'
  )
  .option('--preferAny', 'Use "any" type instead of "unknown"')
  .option(
    '--servicePrefix <string>',
    'Prefix for service names. Useful when you have multiple APIs and you want to avoid name collisions'
  )
  .option(
    '--allowDots <bool>',
    'Determines if dots should be used for serialization object properties'
  )
  .addOption(arrayFormatOption);

program.parse(process.argv);

const options = program.opts<FullAppOptions>();

runCodeGenerator(options).then(complete, error);

function complete([code, opts]: CodeGenResult) {
  if (opts.out) {
    const from = typeof opts.src === 'string' ? `from ${bold(opts.src)} ` : '';
    console.info(cyan(`Api ${from}code generated into ${bold(opts.out)}`));
  } else {
    console.log(code);
  }

  process.exit(0);
}

function error(e: any) {
  const msg = e instanceof Error ? e.message : e;
  console.error(red(msg));
  process.exit(1);
}
