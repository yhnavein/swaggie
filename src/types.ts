export interface ClientOptions {
  src: string;
  out: string;
  template: string;
  baseUrl: string;
  preferAny?: boolean;
  servicePrefix?: string;
  queryModels?: boolean;

  dateFormat?: DateSupport; // 'luxon', 'momentjs', etc
}

export interface FullAppOptions extends ClientOptions {
  config: string;
}

export interface ApiRequestData {
  method: HttpMethod;
  url: string;
  headers: { [index: string]: string };
  body: any;
}

export interface ApiInfo {
  version: string;
  title: string;
}

export interface ApiSpec {
  swagger: string;
  info: ApiInfo;
  host?: string;
  basePath?: string;
  schemes?: string[];
  securityDefinitions?: any;
  paths: any;
  definitions: any;
  accepts: string[];
  contentTypes: string[];
}

export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';
export type DateSupport = 'string' | 'Date'; // 'luxon', 'momentjs', etc

export interface ApiOperation {
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

export interface ApiOperationParam extends ApiOperationParamBase {
  name: string;
  in: 'header' | 'path' | 'query' | 'body' | 'formData';
  description: string;
  required: boolean;
  readonly?: boolean;
  allowEmptyValue: boolean;
  schema: object;
  'x-nullable'?: boolean;
  'x-schema'?: object;
}

type CollectionFormat = 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';

export interface ApiOperationParamBase {
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

export interface ApiOperationParamGroups {
  header?: any;
  path?: any;
  query?: any;
  formData?: any;
  body?: any;
}

export interface ApiOperationResponse {
  code: string;
  description: string;
  schema: object;
  headers: object;
  examples: object;
}

export interface ApiOperationSecurity {
  id: string;
  scopes?: string[];
}

export interface ApiRights {
  query?: any;
  headers?: any;
}
