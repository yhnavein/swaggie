import { resolveSpec, getOperations } from './spec';
import genJsCode from './gen/js';
import { removeOldFiles } from './gen/util';
import * as assert from 'assert';

export function genCode(options: ClientOptions): Promise<any> {
  return verifyOptions(options).then((options) =>
    resolveSpec(options.src, { ignoreRefType: '#/definitions/' }).then((spec) => gen(spec, options))
  );
}

function verifyOptions(options: ClientOptions): Promise<any> {
  try {
    assert.ok(options.src, 'Open API src not specified');
    assert.ok(options.outDir, 'Output directory not specified');
    return Promise.resolve(options);
  } catch (e) {
    return Promise.reject(e);
  }
}

function gen(spec: ApiSpec, options: ClientOptions): ApiSpec {
  removeOldFiles(options);
  const operations = getOperations(spec);
  return genJsCode(spec, operations, options);
}
