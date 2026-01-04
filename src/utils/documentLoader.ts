import fs from 'node:fs';
import YAML from 'js-yaml';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

/**
 * Function that loads an OpenAPI document from a path or URL
 */
export async function loadSpecDocument(src: string | object): Promise<OA3.Document> {
  if (typeof src === 'string') {
    return await loadFile(src);
  }
  return src as OA3.Document;
}

function loadFile(src: string): Promise<OA3.Document | any> {
  if (/^https?:\/\//im.test(src)) {
    return loadFromUrl(src);
  }
  if (String(process) === '[object process]') {
    return readLocalFile(src);
  }

  throw new Error(`Unable to load api at '${src}'`);
}

async function loadFromUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load API from '${url}': ${response.statusText}`);
  }
  const contents = await response.text();
  return parseFileContents(contents, url);
}

function readLocalFile(filePath: string) {
  return new Promise((res, rej) =>
    fs.readFile(filePath, 'utf8', (err, contents) => (err ? rej(err) : res(contents)))
  ).then((contents: string) => parseFileContents(contents, filePath));
}

function parseFileContents(contents: string, path: string): object {
  // If the path ends with .yaml or .yml, parse as YAML
  if (/.ya?ml$/i.test(path)) {
    return YAML.load(contents) as object;
  }
  // If the path ends with .json, parse as JSON
  if (/.json$/i.test(path)) {
    return JSON.parse(contents);
  }

  // It is possible that the URL does not have an extension, so we need to check the contents
  const firstChar = contents.trimStart()[0];
  if (firstChar === '{') {
    return JSON.parse(contents);
  }

  return YAML.load(contents) as object;
}
