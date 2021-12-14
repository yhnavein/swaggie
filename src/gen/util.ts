import { Stats, lstatSync, mkdir, writeFileSync as fsWriteFileSync } from 'fs';
import { dirname } from 'path';

import { ApiOperation, ApiOperationResponse } from '../types';

export function exists(filePath: string): Stats {
  try {
    return lstatSync(filePath);
  } catch (e) {
    return undefined;
  }
}

export function saveFile(filePath: string, contents: string) {
  mkdir(dirname(filePath), { recursive: true }, (err) => {
    if (err) {
      throw err;
    }
    fsWriteFileSync(filePath, contents);
  });
}

export function groupOperationsByGroupName(operations) {
  if (!operations) {
    return {};
  }
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

export function escapeReservedWords(name: string): string {
  let escapedName = name;

  if (reservedWords.indexOf(name) >= 0) {
    escapedName = '_' + name;
  }
  return escapedName;
}

/** This method tries to fix potentially wrong out parameter given from commandline */
export function prepareOutputFilename(out: string): string {
  if (!out) {
    return null;
  }

  if (/\.[jt]sx?$/i.test(out)) {
    return out.replace(/[\\]/i, '/');
  }
  if (/[\/\\]$/i.test(out)) {
    return out.replace(/[\/\\]$/i, '') + '/index.ts';
  }
  return out.replace(/[\\]/i, '/') + '.ts';
}

export function uniq<T>(arr?: T[]) {
  if (!arr) {
    return [];
  }

  return [...new Set(arr)];
}

export function orderBy<T>(arr: T[] | null | undefined, key: string) {
  if (!arr) {
    return [];
  }

  return arr.concat().sort(sortByKey(key));
}

const sortByKey = (key: string) => (a, b) => a[key] > b[key] ? 1 : b[key] > a[key] ? -1 : 0;

export function upperFirst(str?: string | null) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
