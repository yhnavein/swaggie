import * as assert from 'assert';
import genJsCode from './gen/js';
import { loadAllTemplateFiles } from './gen/templateManager';
import { getOperations, resolveSpec } from './spec';

export function genCode(options: ClientOptions): Promise<any> {
  return verifyOptions(options).then((options) =>
    resolveSpec(options.src, { ignoreRefType: '#/definitions/' }).then((spec) => gen(spec, options))
  );
}

function verifyOptions(options: ClientOptions): Promise<any> {
  try {
    assert.ok(options.src, 'Open API src not specified');
    assert.ok(options.out, 'Output not specified');
    return Promise.resolve(options);
  } catch (e) {
    return Promise.reject(e);
  }
}

function gen(spec: ApiSpec, options: ClientOptions): ApiSpec {
  loadAllTemplateFiles('axios');

  const operations = getOperations(spec);
  return genJsCode(spec, operations, options);
}
