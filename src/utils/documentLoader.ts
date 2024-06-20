import YAML from 'js-yaml';
import fs from 'node:fs';
import fetch from 'node-fetch';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

export interface SpecOptions {
  /**
   * A base ref string to ignore when expanding ref dependencies e.g. '#/definitions/'
   */
  ignoreRefType?: string;
}

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

// function formatSpec(spec: OA3.Document, src?: string, options?: SpecOptions): OA3.Document {
//   if (!spec.basePath) {
//     spec.basePath = '';
//   } else if (spec.basePath.endsWith('/')) {
//     spec.basePath = spec.basePath.slice(0, -1);
//   }

//   if (src && /^https?:\/\//im.test(src)) {
//     const parts = src.split('/');
//     if (!spec.host) {
//       spec.host = parts[2];
//     }
//     if (!spec.schemes || !spec.schemes.length) {
//       spec.schemes = [parts[0].slice(0, -1)];
//     }
//   } else {
//     if (!spec.host) {
//       spec.host = 'localhost';
//     }
//     if (!spec.schemes || !spec.schemes.length) {
//       spec.schemes = ['http'];
//     }
//   }

//   const s: any = spec;
//   if (!s.produces || !s.produces.length) {
//     s.accepts = ['application/json']; // give sensible default
//   } else {
//     s.accepts = s.produces;
//   }

//   if (!s.consumes) {
//     s.contentTypes = [];
//   } else {
//     s.contentTypes = s.consumes;
//   }

//   delete s.consumes;
//   delete s.produces;

//   return expandRefs(spec, spec, options) as ApiSpec;
// }

// /**
//  * Recursively expand internal references in the form `#/path/to/object`.
//  *
//  * @param {object} data the object to search for and update refs
//  * @param {object} lookup the object to clone refs from
//  * @param {regexp=} refMatch an optional regex to match specific refs to resolve
//  * @returns {object} the resolved data object
//  */
// export function expandRefs(data: any, lookup: object, options: SpecOptions): any {
//   if (!data) {
//     return data;
//   }

//   if (Array.isArray(data)) {
//     return data.map((item) => expandRefs(item, lookup, options));
//   }
//   if (typeof data === 'object') {
//     if (dataCache.has(data)) {
//       return data;
//     }
//     if (data.$ref && !(options.ignoreRefType && data.$ref.startsWith(options.ignoreRefType))) {
//       const resolved = expandRef(data.$ref, lookup);
//       delete data.$ref;
//       data = Object.assign({}, resolved, data);
//     }
//     dataCache.add(data);

//     for (const name in data) {
//       data[name] = expandRefs(data[name], lookup, options);
//     }
//   }
//   return data;
// }

// function expandRef(ref: string, lookup: object): any {
//   const parts = ref.split('/');
//   if (parts.shift() !== '#' || !parts[0]) {
//     throw new Error(`Only support JSON Schema $refs in format '#/path/to/ref'`);
//   }
//   let value = lookup;
//   while (parts.length) {
//     value = value[parts.shift()];
//     if (!value) {
//       throw new Error(`Invalid schema reference: ${ref}`);
//     }
//   }
//   return value;
// }

// const dataCache = new Set();
