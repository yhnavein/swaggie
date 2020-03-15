interface ClientOptions {
  src: string;
  out: string;
  template: string;
  baseUrl: string;
  reactHooks: boolean;
  preferAny?: boolean;
  servicePrefix?: string;
}

interface ApiRequestData {
  method: HttpMethod;
  url: string;
  headers: { [index: string]: string };
  body: any;
}

interface ApiInfo {
  version: string;
  title: string;
}

interface ApiSpec {
  swagger: string;
  info: ApiInfo;
  host: string;
  basePath: string;
  schemes: string[];
  securityDefinitions: any;
  paths: any;
  definitions: any;
  accepts: string[];
  contentTypes: string[];
}

type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';

interface ApiOperation {
  id: string;
  summary: string;
  description: string;
  method: HttpMethod;
  group: string;
  path: string;
  parameters: ApiOperationParam[];
  responses: ApiOperationResponse[];
  security?: ApiOperationSecurity[];
  accepts: string[];
  contentTypes: string[];
  tags?: string[];
}

interface ApiOperationParam extends ApiOperationParamBase {
  name: string;
  in: 'header' | 'path' | 'query' | 'body' | 'formData';
  description: string;
  required: boolean;
  allowEmptyValue: boolean;
  schema: object;
  'x-nullable'?: boolean;
  'x-schema'?: object;
}

type CollectionFormat = 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';

interface ApiOperationParamBase {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'file';
  format:
    | 'int32'
    | 'int64'
    | 'float'
    | 'double'
    | 'byte'
    | 'binary'
    | 'date'
    | 'date-time'
    | 'password';
  items: ApiOperationParamBase;
  collectionFormat: CollectionFormat;
  default: any;
  maximum: number;
  exclusiveMaximum: boolean;
  minimum: number;
  exclusiveMinimum: boolean;
  maxLength: number;
  minLength: number;
  pattern: string;
  maxItems: number;
  minItems: number;
  uniqueItems: boolean;
  enum: any[];
  multipleOf: number;
}

interface ApiOperationParamGroups {
  header?: any;
  path?: any;
  query?: any;
  formData?: any;
  body?: any;
}

interface ApiOperationResponse {
  code: string;
  description: string;
  schema: object;
  headers: object;
  examples: object;
}

interface ApiOperationSecurity {
  id: string;
  scopes?: string[];
}

interface ApiRights {
  query?: any;
  headers?: any;
}
