import { lstatSync, readdirSync, Stats, unlinkSync, writeFileSync as fsWriteFileSync } from 'fs';
import { sync as mkdirSync } from 'mkdirp';
import * as PATH from 'path';
import * as prettier from 'prettier';

import { ApiOperation, ApiOperationResponse, ClientOptions } from '../types';

export function exists(filePath: string): Stats {
  try {
    return lstatSync(filePath);
  } catch (e) {
    return undefined;
  }
}

export function saveAndPrettifyFile(filePath, contents) {
  mkdirSync(PATH.dirname(filePath));

  let result = null;
  try {
    result = prettier.format(contents, { parser: 'typescript' });
  } catch (ex) {
    result = contents;
  }

  fsWriteFileSync(filePath, result);
}

export function groupOperationsByGroupName(operations) {
  return operations.reduce((groups, op) => {
    if (!groups[op.group]) {
      groups[op.group] = [];
    }
    groups[op.group].push(op);
    return groups;
  }, {});
}

export function join(parent: string[], child: string[]): string[] {
  parent.push.apply(parent, child);
  return parent;
}

export function camelToUppercase(value: string): string {
  return value.replace(/([A-Z]+)/g, '$1').toUpperCase();
}

export function getBestResponse(op: ApiOperation): ApiOperationResponse {
  const NOT_FOUND = 100000;
  const lowestCode = op.responses.reduce((code, resp) => {
    const responseCode = parseInt(resp.code, 10);
    if (isNaN(responseCode) || responseCode >= code) {
      return code;
    } else {
      return responseCode;
    }
  }, NOT_FOUND);

  return lowestCode === NOT_FOUND
    ? op.responses[0]
    : op.responses.find((resp) => resp.code === lowestCode.toString());
}

export function removeOldFiles(options: ClientOptions) {
  cleanDirs(options.outDir, options);
}

const TS_EXTENSION = 'ts';

function cleanDirs(dir: string, options: ClientOptions) {
  dir = PATH.resolve(dir);
  const stats = exists(dir);
  if (!stats || !stats.isDirectory()) {
    return;
  }

  const files = readdirSync(dir).map((file) => PATH.resolve(`${dir}/${file}`));
  while (files.length) {
    const file = files.pop();
    if (file.endsWith(TS_EXTENSION) && !file.endsWith(`index.${TS_EXTENSION}`)) {
      unlinkSync(file);
    } else if (exists(file).isDirectory()) {
      cleanDirs(file, options);
    }
  }
}

const reservedWords = [
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
];

const basicTypes = ['number', 'boolean', 'null', 'undefined', 'object'];

export function escapeReservedWords(name: string): string {
  let escapedName = name;

  if (reservedWords.indexOf(name) >= 0) {
    escapedName = '_' + name;
  }
  return escapedName;
}

export function isBasicType(type: string) {
  if (!type) {
    return false;
  }
  const sanitizeType = type.toLowerCase().replace(']', '');
  return basicTypes.indexOf(sanitizeType) > -1;
}
