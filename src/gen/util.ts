import { type Stats, lstatSync, mkdir, writeFileSync as fsWriteFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

import type { ApiOperationResponse } from '../types';

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

/**
 * Operations in OpenAPI can have multiple responses, but
 * we are interested in the one that is the most common for
 * a standard success response. And we need the content of it.
 * Content is per media type and we need to choose only one.
 * We will try to get the first one that is JSON or plain text.
 * Other media types are not supported at this time.
 * @returns Response or reference of the success response
 */
export function getBestResponse(op: OA3.OperationObject) {
  const NOT_FOUND = 100000;
  const lowestCode = Object.keys(op.responses).sort().shift() ?? NOT_FOUND;

  const resp = lowestCode === NOT_FOUND ? op.responses[0] : op.responses[lowestCode.toString()];

  if (resp && 'content' in resp) {
    return (
      resp.content['application/json'] ??
      resp.content['text/json'] ??
      resp.content['text/plain'] ??
      null
    );
  }
  return null;
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
    return `${out.replace(/[\/\\]$/i, '')}/index.ts`;
  }
  return `${out.replace(/[\\]/i, '/')}.ts`;
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
