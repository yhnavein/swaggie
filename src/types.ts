import type { OpenAPIV3 as OA3 } from 'openapi-types';

interface QueryParamsSerializationOptions {
  allowDots?: boolean;
  arrayFormat?: ArrayFormat;
}

export interface ClientOptions {
  /**
   * Path or URL to the Swagger specification file (JSON or YAML).
   * Alternatively you can provide parsed object here instead
   **/
  src: string | object;
  /** Path to the file which will contain generated TypeScript code */
  out?: string;
  /** Template to be used for code generation */
  template: Template;
  baseUrl?: string;
  preferAny?: boolean;
  servicePrefix?: string;
  /** How date should be handled. It does not do any special serialization */
  dateFormat?: DateSupport;
  /** Options for query parameters serialization */
  queryParamsSerialization: QueryParamsSerializationOptions;
}

export interface CliOptions extends FullAppOptions {
  allowDots?: boolean;
  arrayFormat?: ArrayFormat;
}

export interface FullAppOptions extends ClientOptions {
  /** Path to the configuration file that contains actual config to be used */
  config?: string;
}

export type Template = 'axios' | 'fetch' | 'ng1' | 'ng2' | 'swr-axios' | 'xior' | 'tsq-xior';
export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';
export type DateSupport = 'string' | 'Date'; // 'luxon', 'momentjs', etc
export type ArrayFormat = 'indices' | 'repeat' | 'brackets';

/**
 * Local type that represent Operation as understood by Swaggie
 **/
export interface ApiOperation extends OA3.OperationObject {
  method: HttpMethod;
  path: string;
  group: string;
}
