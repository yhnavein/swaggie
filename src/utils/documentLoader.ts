import fs from 'node:fs';
import { parse as parseYaml } from 'yaml';
import type { OpenAPIV3 as OA3 } from 'openapi-types';
import { resolveExternalFileRefs } from './refResolver';

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

async function readLocalFile(filePath: string) {
  const contents = await new Promise((res, rej) =>
    fs.readFile(filePath, 'utf8', (err, loadedContents) => (err ? rej(err) : res(loadedContents)))
  );
  const spec = parseFileContents(contents as string, filePath) as OA3.Document;

  return resolveExternalFileRefs(spec, filePath);
}

function parseFileContents(contents: string, path: string): object {
  // If the path ends with .yaml or .yml, parse as YAML
  if (/.ya?ml$/i.test(path)) {
    return parseYaml(contents);
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

  return parseYaml(contents);
}
