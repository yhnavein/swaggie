import YAML from 'js-yaml';
import fs from 'node:fs';
import fetch from 'node-fetch';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

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

function loadFromUrl(url: string) {
  return fetch(url)
    .then((resp) => resp.text())
    .then((contents) => parseFileContents(contents, url));
}

function readLocalFile(filePath: string) {
  return new Promise((res, rej) =>
    fs.readFile(filePath, 'utf8', (err, contents) => (err ? rej(err) : res(contents)))
  ).then((contents: string) => parseFileContents(contents, filePath));
}

function parseFileContents(contents: string, path: string): object {
  return /.ya?ml$/i.test(path) ? YAML.load(contents) : JSON.parse(contents);
}
