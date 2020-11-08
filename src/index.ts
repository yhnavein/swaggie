import fs from 'fs';
import chalk from 'chalk';
import openApiConverter from 'swagger2openapi';
import { OpenAPIV3 as OA3 } from 'openapi-types';

import { ClientOptions, FullAppOptions } from './types';
import { loadSpecification } from './specLoader';

export function runCodeGenerator(options: FullAppOptions): Promise<any> {
  return verifyOptions(options)
    .then(applyConfigFile)
    .then((options) =>
      loadSpecification(options.src)
        .then((spec) => verifyAndConvert(spec))
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

/** Loads spec file and verifies if it's a valid one. If it's Swagger it will convert it to OpenAPI3 */
export function verifyAndConvert(spec: any): Promise<OA3.Document> {
  if (!spec || (!spec.swagger && !spec.openapi)) {
    return Promise.reject(
      'Spec does not look like valid file! Supported are only OpenApi2/Swagger and OpenApi3'
    );
  }
  if (spec.swagger) {
    console.info(
      chalk.bold.yellow(`Loaded spec looks like the OpenApi2. Converting to OpenApi3...`)
    );
    return new Promise((resolve, reject) => {
      openApiConverter.convertObj(
        spec,
        {
          patch: true,
          warnOnly: true,
        },
        (err, convertedSpec) => {
          if (err) {
            return reject('Errors found when converting spec.');
          }
          return resolve(convertedSpec.openapi);
        }
      );
    });
  }
  return Promise.resolve(spec);
}

function gen(spec: OA3.Document, options: ClientOptions): void {
  // loadAllTemplateFiles(options.template || 'axios');
  // const operations = getOperations(spec);
  // return genJsCode(spec, operations, options);
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
