import YAML from 'js-yaml';
import fetch from 'node-fetch';

/** Either tries to load spec from given location or returns it further if it was already given */
export function loadSpecification(src: string | object): Promise<any> {
  if (typeof src === 'string') {
    return loadFile(src);
  } else {
    return Promise.resolve(src);
  }
}

function loadFile(src: string): Promise<any> {
  if (/^https?:\/\//im.test(src)) {
    return loadFromUrl(src);
  } else if (String(process) === '[object process]') {
    return readLocalFile(src).then((contents) => parseFileContents(contents, src));
  } else {
    throw new Error(`Unable to load api at '${src}'`);
  }
}

function loadFromUrl(url: string) {
  return fetch(url)
    .then((resp) => resp.text())
    .then((contents) => parseFileContents(contents, url));
}

function readLocalFile(filePath: string): Promise<string> {
  return new Promise((res, rej) =>
    require('fs').readFile(filePath, 'utf8', (err, contents) => (err ? rej(err) : res(contents)))
  );
}

function parseFileContents(contents: string, path: string): object {
  return /.ya?ml$/i.test(path) ? YAML.load(contents) : JSON.parse(contents);
}

/**
 * Recursively expand internal references in the form `#/path/to/object`.
 *
 * @param {object} data the object to search for and update refs
 * @param {object} lookup the object to clone refs from
 * @param {regexp=} refMatch an optional regex to match specific refs to resolve
 * @returns {object} the resolved data object
 */
function expandRefs(data: any, lookup: object): any {
  if (!data) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => expandRefs(item, lookup));
  } else if (typeof data === 'object') {
    if (dataCache.has(data)) {
      return data;
    }
    if (data.$ref) {
      const resolved = expandRef(data.$ref, lookup);
      delete data.$ref;
      data = Object.assign({}, resolved, data);
    }
    dataCache.add(data);

    for (let name in data) {
      data[name] = expandRefs(data[name], lookup);
    }
  }
  return data;
}

function expandRef(ref: string, lookup: object): any {
  const parts = ref.split('/');
  if (parts.shift() !== '#' || !parts[0]) {
    throw new Error(`Only support JSON Schema $refs in format '#/path/to/ref'`);
  }
  let value = lookup;
  while (parts.length) {
    value = value[parts.shift()];
    if (!value) {
      throw new Error(`Invalid schema reference: ${ref}`);
    }
  }
  return value;
}

const dataCache = new Set();
