#!/usr/bin/env node

import { bold, cyan, red } from 'picocolors';
import { Command, Option } from 'commander';
import fs from 'node:fs';
import path from 'node:path';

import { type CodeGenResult, runCodeGenerator } from './index';
import type { CliOptions, FullAppOptions } from './types';

const arrayFormatOption = new Option(
  '--arrayFormat <format>',
  'Determines how arrays should be serialized'
).choices(['indices', 'repeat', 'brackets']);

const packageJson = readPackageJson();

const modeOption = new Option('-m, --mode <mode>', 'Generation mode').choices([
  'full',
  'schemas',
]);
const schemaStyleOption = new Option(
  '-d, --schemaStyle <style>',
  'Schema object declaration style'
).choices(['interface', 'type']);
const enumStyleOption = new Option(
  '--enumStyle <style>',
  'Enum declaration style for plain string enums'
).choices(['union', 'enum']);
const enumNamesStyleOption = new Option(
  '--enumNamesStyle <style>',
  'Controls how enum member names are formatted (only with --enumStyle enum)'
).choices(['original', 'PascalCase', 'pascal']);
const dateFormatOption = new Option(
  '--dateFormat <format>',
  'How date fields are emitted in generated types'
).choices(['Date', 'string']);
const nullableStrategyOption = new Option(
  '--nullables <strategy>',
  "Controls how OpenAPI 'nullable' is translated into TypeScript types"
).choices(['include', 'nullableAsOptional', 'ignore']);
const queryParamsAsObjectOption = new Option(
  '--queryParamsAsObject [threshold]',
  'Group query params into a single object; pass a number to group only when query params count is greater than threshold'
).argParser(parseQueryParamsAsObjectArg);

const program = new Command();
program
  .version(packageJson.version)
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
    'Template used for generating API client. ' +
      'L1 (HTTP client) templates: "axios" (default), "fetch", "xior", "ng1", "ng2". ' +
      'L2 (reactive layer) templates must be paired with an L1 using a comma-separated value: ' +
      '"swr,axios", "swr,fetch", "tsq,xior", "tsq,fetch", etc. ' +
      'Providing only an L2 name (e.g. "swr") defaults to "fetch" as the L1.',
    parseTemplateArg
  )
  .option('--preferAny', 'Use "any" type instead of "unknown"')
  .option(
    '--skipDeprecated',
    'Skip deprecated operations. When enabled, deprecated operations will be skipped from the generated code'
  )
  .option(
    '--servicePrefix <string>',
    'Prefix for service names. Useful when you have multiple APIs and you want to avoid name collisions'
  )
  .option(
    '--allowDots <bool>',
    'Determines if dots should be used for serialization object properties'
  )
  .addOption(arrayFormatOption)
  .addOption(modeOption)
  .addOption(schemaStyleOption)
  .addOption(enumStyleOption)
  .addOption(enumNamesStyleOption)
  .addOption(dateFormatOption)
  .addOption(nullableStrategyOption)
  .addOption(queryParamsAsObjectOption);

program.parse(process.argv);

const options = program.opts<CliOptions>();

runCodeGenerator(options as Partial<FullAppOptions>).then(complete, error);

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

function readPackageJson() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  } catch (e) {
    throw new Error('Could not read package.json file');
  }
}

function parseTemplateArg(value: string): string | [string, string] {
  const parts = value.split(',').map((s) => s.trim());
  if (parts.length === 1) {
    return parts[0];
  }
  if (parts.length === 2) {
    return [parts[0], parts[1]];
  }
  throw new Error(
    `--template accepts at most 2 comma-separated values (e.g. "swr,axios"). Got ${parts.length}.`
  );
}

function parseQueryParamsAsObjectArg(value?: string): boolean | number {
  if (value === undefined) {
    return true;
  }

  const threshold = Number(value);
  if (!Number.isInteger(threshold) || threshold < 0) {
    throw new Error('--queryParamsAsObject threshold must be a non-negative integer');
  }

  return threshold;
}
