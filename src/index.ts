import genJsCode from './gen/js';
import fs from 'fs';
import chalk from 'chalk';

import { loadAllTemplateFiles } from './gen/templateManager';
import { getOperations, resolveSpec } from './spec';

export function runCodeGenerator(options: FullAppOptions): Promise<any> {
  return verifyOptions(options)
    .then(applyConfigFile)
    .then((options) =>
      resolveSpec(options.src, { ignoreRefType: '#/definitions/' })
        .then((spec) => gen(spec, options))
        .then(() => {
          console.info(
            chalk.bold.cyan(`Api from ${options.src} code generated into ${options.out}`)
          );
          return true;
        })
    );
}

function verifyOptions(options: FullAppOptions): Promise<any> {
  try {
    if (!options.config && (!options.src || !options.out)) {
      return Promise.reject('You need to provide --config or --src and --out parameters');
    }
    return Promise.resolve(options);
  } catch (e) {
    return Promise.reject(e);
  }
}

function gen(spec: ApiSpec, options: ClientOptions): ApiSpec {
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
