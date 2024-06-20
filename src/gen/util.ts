import { type Stats, lstatSync, mkdir, writeFileSync as fsWriteFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { ApiOperation, ApiOperationResponse } from '../types';

export function exists(filePath: string): Stats {
  try {
    return lstatSync(filePath);
  } catch (e) {
    return undefined;
  }
}

export function saveFile(filePath: string, contents: string) {
  return new Promise((resolve, reject) => {
    mkdir(dirname(filePath), { recursive: true }, (err) => {
      if (err) {
        reject(err);
      }

      fsWriteFileSync(filePath, contents);
      resolve(true);
    });
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
    const responseCode = Number.parseInt(resp.code, 10);
    if (Number.isNaN(responseCode) || responseCode >= code) {
      return code;
    }
    return responseCode;
  }, NOT_FOUND);

  return lowestCode === NOT_FOUND
    ? op.responses[0]
    : op.responses.find((resp) => resp.code === lowestCode.toString());
}

/** This method tries to fix potentially wrong out parameter given from commandline */
export function prepareOutputFilename(out: string | null): string {
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
