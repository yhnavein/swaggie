import { injectable } from 'inversify';
import { ApiSpec, ApiOperation, HttpMethod, ApiOperationResponse, ApiOperationSecurity } from '../types';

// TODO: injectable?
const SUPPORTED_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

// TODO: get rid of private methods
@injectable()
export class OperationsParser {
  getOperations(spec: ApiSpec): ApiOperation[] {
    return this.getPaths(spec).reduce<ApiOperation[]>(
      (ops, pathInfo) => ops.concat(this.getPathOperations(pathInfo, spec)),
      []
    );
  }

  private getPaths(spec: ApiSpec): object[] {
    return Object.keys(spec.paths || {}).map((path) => Object.assign({ path }, spec.paths[path]));
  }

  private getPathOperations(pathInfo, spec): ApiOperation[] {
    return Object.keys(pathInfo)
      .filter((key) => !!SUPPORTED_METHODS.indexOf(key))
      .map((method) => this.getPathOperation(method as HttpMethod, pathInfo, spec));
  }

  private inheritPathParams(op, spec, pathInfo) {
    const pathParams = spec.paths[pathInfo.path].parameters;
    if (pathParams) {
      pathParams.forEach((pathParam) => {
        if (!op.parameters.some((p) => p.name === pathParam.name && p.in === pathParam.in)) {
          op.parameters.push(Object.assign({}, pathParam));
        }
      });
    }
  }

  private getPathOperation(method: HttpMethod, pathInfo, spec: ApiSpec): ApiOperation {
    const op = Object.assign({ method, path: pathInfo.path, parameters: [] }, pathInfo[method]);
    op.id = op.operationId;

    // if there's no explicit operationId given, create one based on the method and path
    if (!op.id) {
      op.id = method + pathInfo.path;
      op.id = op.id.replace(/[\/{(?\/{)\-]([^{.])/g, (_, m) => m.toUpperCase());
      op.id = op.id.replace(/[\/}\-]/g, '');
    }

    this.inheritPathParams(op, spec, pathInfo);

    op.group = this.getOperationGroupName(op);
    delete op.operationId;
    op.responses = this.getOperationResponses(op);
    op.security = this.getOperationSecurity(op, spec);

    // TODO: why any?
    const operation: any = op;
    if (operation.consumes) {
      operation.contentTypes = operation.consumes;
    }
    if (operation.produces) {
      operation.accepts = operation.produces;
    }
    delete operation.consumes;
    delete operation.produces;

    if (!op.contentTypes || !op.contentTypes.length) {
      op.contentTypes = spec.contentTypes.slice();
    }
    if (!op.accepts || !op.accepts.length) {
      op.accepts = spec.accepts.slice();
    }
    return op as ApiOperation;
  }

  private getOperationGroupName(op: any): string {
    let name = op.tags && op.tags.length ? op.tags[0] : 'default';
    name = name.replace(/[^$_a-z0-9]+/gi, '');
    return name.replace(/^[0-9]+/m, '');
  }

  private getOperationResponses(op: any): ApiOperationResponse[] {
    return Object.keys(op.responses || {}).map((code) => {
      const info = op.responses[code];
      info.code = code;
      return info;
    });
  }

  private getOperationSecurity(op: any, spec: any): ApiOperationSecurity[] {
    let security;

    if (op.security && op.security.length) {
      security = op.security;
    } else if (spec.security && spec.security.length) {
      security = spec.security;
    } else {
      return;
    }

    return security.map((def) => {
      const id = Object.keys(def)[0];
      const scopes = def[id].length ? def[id] : undefined;
      return { id, scopes };
    });
  }
}
