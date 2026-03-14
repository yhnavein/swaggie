import { parse as parseYaml } from 'yaml';
import type { OpenAPIV3 as OA3 } from 'openapi-types';

/**
 * Browser-safe OpenAPI loader.
 * Supports URL and already parsed objects.
 */
export async function loadSpecDocument(src: string | object): Promise<OA3.Document> {
  if (typeof src !== 'string') {
    return src as OA3.Document;
  }

  if (!/^https?:\/\//im.test(src)) {
    throw new Error(
      `Unable to load api at '${src}'. In browser mode pass URL or parsed object as "src".`
    );
  }

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Failed to load API from '${src}': ${response.statusText}`);
  }

  const contents = await response.text();
  return parseFileContents(contents, src) as OA3.Document;
}

function parseFileContents(contents: string, path: string): object {
  if (/.ya?ml$/i.test(path)) {
    return parseYaml(contents);
  }
  if (/.json$/i.test(path)) {
    return JSON.parse(contents);
  }

  const firstChar = contents.trimStart()[0];
  if (firstChar === '{') {
    return JSON.parse(contents);
  }

  return parseYaml(contents);
}
