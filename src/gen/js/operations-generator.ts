import { injectable, inject } from 'inversify';
import { ApiSpec, ApiOperation, ClientOptions, ApiOperationParam } from '../../types';
import { camelCase, orderBy, last } from 'lodash';
import { escapeReservedWords, saveAndPrettifyFile, groupOperationsByGroupName, getBestResponse } from '../util';
import * as path from 'path';
import { IOperationParam, IServiceClient, IApiOperation } from './models';
import { getTSParamType } from './support';
import { TYPES, Ejs } from '../../ioc/types';

@injectable()
export class OperationsGenerator {
  constructor(
    @inject(TYPES.Ejs) private readonly ejs: Ejs,
  ) { }

  generate(
    spec: ApiSpec,
    operations: ApiOperation[],
    options: ClientOptions
  ) {
    const groups = groupOperationsByGroupName(operations);
    // tslint:disable-next-line:forin prefer-const
    for (let name in groups) {
      const group = groups[name];
      const clientData = this.prepareClient(name, group);
      const absPath = path.join(__dirname, '..', '..', '..', 'templates', 'axios', 'client.ejs');

      this.ejs.renderFile(absPath, clientData, (err, str) => {
        if (err) {
          console.error(err);
        }
        const path = `${options.outDir}/${name}.ts`;
        const contents = str;

        saveAndPrettifyFile(path, contents);
      });
    }

    this.createBarrelFile(groups, `${options.outDir}/index.ts`);
  }

  renderOperationGroup(
    group: any[],
    func: any,
    spec: ApiSpec,
    options: ClientOptions
  ): string[] {
    return group.map((op) => func.call(this, spec, op, options)).reduce((a, b) => a.concat(b));
  }

  renderParamSignature(
    op: ApiOperation,
    options: ClientOptions,
    pkg?: string
  ): string {
    const params = op.parameters;
    const required = params.filter((param) => param.required);
    const optional = params.filter((param) => !param.required);
    const funcParams = this.renderRequiredParamsSignature(required, options);
    const optParam = this.renderOptionalParamsSignature(op, optional, options, pkg);
    if (optParam.length) {
      funcParams.push(optParam);
    }

    return funcParams.map((p) => p.join(': ')).join(', ');
  }

  private createBarrelFile(clients: any[], path: string) {
    const files = ['types'];

    // tslint:disable-next-line:forin prefer-const
    for (let name in clients) {
      files.push(name);
    }

    const contents = files.map((f) => `export * from './${f}';`).join('\n');

    saveAndPrettifyFile(path, contents);
  }

  private prepareClient(name: string, operations: ApiOperation[]): IServiceClient {
    return {
      clientName: name,
      operations: this.prepareOperations(operations),
    };
  }

  private prepareOperations(operations: ApiOperation[]): IApiOperation[] {
    const ops = this.fixDuplicateOperations(operations);

    return ops.map((op) => {
      const response = getBestResponse(op);
      const respType = getTSParamType(response, true);

      return {
        returnType: respType,
        method: op.method.toUpperCase(),
        name: this.getOperationName(op.id, op.group),
        url: op.path,
        parameters: this.getParams(op.parameters),
        query: this.getParams(op.parameters, ['query']),
        pathParams: this.getParams(op.parameters, ['path']),
        body: last(this.getParams(op.parameters, ['body'])),
        headers: this.getParams(op.parameters, ['header']),
      };
    });
  }

  /**
   * We will add numbers to the duplicated operation names to avoid breaking code
   * @param operations
   */
  private fixDuplicateOperations(operations: ApiOperation[]): ApiOperation[] {
    if (!operations || operations.length < 2) {
      return operations;
    }

    const results = orderBy(operations, (o) => o.id);

    let inc = 0;
    let prevOpId = results[0].id;
    for (let i = 1; i < results.length; i++) {
      if (results[i].id === prevOpId) {
        results[i].id += (++inc).toString();
      } else {
        inc = 0;
        prevOpId = results[i].id;
      }
    }

    return results;
  }

  private getOperationName(opId: string, group?: string) {
    if (!group) {
      return opId;
    }

    return camelCase(opId.replace(group + '_', ''));
  }

  private getParams(params: ApiOperationParam[], where?: string[]): IOperationParam[] {
    if (!params || params.length < 1) {
      return [];
    }

    return params
      .filter((p) => !where || where.indexOf(p.in) > -1)
      .map((p) => ({
        originalName: p.name,
        name: this.getParamName(p.name),
        type: getTSParamType(p, true),
        optional: !p.required,
      }));
  }

  private renderRequiredParamsSignature(
    required: ApiOperationParam[],
    options: ClientOptions
  ): string[][] {
    return required.reduce<string[][]>((a, param) => {
      a.push(this.getParamSignature(param, options));
      return a;
    }, []);
  }

  private renderOptionalParamsSignature(
    op: ApiOperation,
    optional: ApiOperationParam[],
    options: ClientOptions,
    pkg?: string
  ) {
    if (!optional.length) {
      return [];
    }
    if (!pkg) {
      pkg = '';
    }
    const s = '?';
    const param = [`options${s}`];

    param.push(`${pkg}${op.id[0].toUpperCase() + op.id.slice(1)}Options`);
    return param;
  }

  private getParamSignature(param: ApiOperationParam, options: ClientOptions): string[] {
    const signature = [this.getParamName(param.name)];

    signature.push(getTSParamType(param, true));

    return signature;
  }

  private getParamName(name: string): string {
    return escapeReservedWords(camelCase(name));
  }
}
