import type { OpenAPIV3 as OA3 } from 'openapi-types';

export interface ClientOptions {
  /**
   * Path or URL to the Swagger specification file (JSON or YAML).
   * Alternatively you can provide parsed object here instead
   **/
  src: string | object;
  /** Path to the file which will contain generated TypeScript code */
  out?: string;
  /** Template to be used for generation */
  template: Template;
  baseUrl?: string;
  preferAny?: boolean;
  servicePrefix?: string;
  /** How date should be handled. It does not do any special serialization */
  dateFormat?: DateSupport; // 'luxon', 'momentjs', etc
}

export interface FullAppOptions extends ClientOptions {
  /** Path to the configuration file that contains actual config tp be used */
  config?: string;
}

export type Template = 'axios' | 'fetch' | 'ng1' | 'ng2' | 'swr-axios' | 'xior';
export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';
export type DateSupport = 'string' | 'Date'; // 'luxon', 'momentjs', etc

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

/**
 * Local type that represent Operation as understood by Swaggie
 **/
export interface ApiOperation extends OA3.OperationObject {
  method: HttpMethod;
  path: string;
  group: string;
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
