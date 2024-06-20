import fs from 'fs';

import genJsCode from './gen/js';
import { loadAllTemplateFiles } from './gen/templateManager';
import { getOperations, resolveSpec } from './swagger';
import type { ApiSpec, ClientOptions, FullAppOptions } from './types';

/** Runs whole code generation process. @returns generated code */
export function runCodeGenerator(options: FullAppOptions) {
  return verifyOptions(options)
    .then(applyConfigFile)
    .then((opts) =>
      resolveSpec(opts.src, { ignoreRefType: '#/definitions/' })
        .then((spec) => verifySpec(spec))
        .then((spec) => gen(spec, opts))
        .then((code) => [code, opts] as CodeGenResult)
    );
}

function verifyOptions(options: FullAppOptions) {
  if (!options) {
    return Promise.reject('Options were not provided');
  }
  if (!!options.config === !!options.src) {
    return Promise.reject('You need to provide either --config or --src parameters');
  }
  return Promise.resolve(options);
}

/** Validates if the spec is correct and if is supported */
export function verifySpec(spec: ApiSpec): Promise<ApiSpec> {
  if (!spec || !spec.swagger)
    return Promise.reject('Spec does not look like Swagger / OpenAPI 2! Open API 3 support is WIP');
  return Promise.resolve(spec);
}

function gen(spec: ApiSpec, options: ClientOptions): Promise<string> {
  loadAllTemplateFiles(options.template || 'axios');

  const operations = getOperations(spec);
  return genJsCode(spec, operations, options);
}

export function applyConfigFile(options: FullAppOptions): Promise<ClientOptions> {
  return new Promise((resolve, reject) => {
    if (!options.config) {
      return resolve(options);
    }

    const configUrl = options.config;
    return readFile(configUrl)
      .then((contents) => {
        const parsedConfig = JSON.parse(contents);
        if (!parsedConfig || parsedConfig.length < 1) {
          return reject('Could not correctly load config file. Is it a valid JSON file?');
        }
        return resolve(Object.assign({}, parsedConfig, options));
      })
      .catch((ex) =>
        reject('Could not correctly load config file. It does not exist or you cannot access it')
      );
  });
}

function readFile(filePath: string): Promise<string> {
  return new Promise((res, rej) => {
    return fs.readFile(filePath, 'utf8', (err, contents) => (err ? rej(err) : res(contents)));
  });
}

export type CodeGenResult = [string, ClientOptions];
