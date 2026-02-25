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
  /** Skip deprecated operations. When enabled, deprecated operations will be skipped from the generated code */
  skipDeprecated?: boolean;
  servicePrefix?: string;
  /** How date should be handled. It does not do any special serialization */
  dateFormat?: DateSupport;
  /**
   * Controls how OpenAPI 'nullable' is translated into TypeScript types. Default: 'ignore'.
   * 'include' - 'nullable: true' appends `| null` to the TypeScript type (e.g. `string | null`).
   * 'nullableAsOptional' - 'nullable: true' makes the property optional (`?`) instead of adding `| null`.
   * 'ignore' - 'nullable: true' is ignored.
   */
  nullableStrategy?: NullableStrategy;
  /** Options for query parameters serialization */
  queryParamsSerialization: QueryParamsSerializationOptions;

  /** Offers ability to adjust the OpenAPI spec before it is processed */
  modifiers?: {
    /** Global-level modifiers for parameter with a given name */
    parameters?: {
      [key: string]: 'optional' | 'required' | 'ignore';
    };
  };
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
export type DateSupport = 'string' | 'Date';
export type ArrayFormat = 'indices' | 'repeat' | 'brackets';
export type NullableStrategy = 'include' | 'nullableAsOptional' | 'ignore';

/**
 * Internal options type used throughout the app after `prepareAppOptions` has run.
 * All fields that have defaults are required here so the rest of the codebase never
 * needs to perform its own `?? fallback` logic.
 */
export interface AppOptions extends ClientOptions {
  template: Template;
  servicePrefix: string;
  nullableStrategy: NullableStrategy;
  queryParamsSerialization: {
    allowDots: boolean;
    arrayFormat: ArrayFormat;
  };
}

/** Default values applied to every field of AppOptions that has a default. */
export const APP_DEFAULTS: Partial<AppOptions> = {
  template: 'axios',
  servicePrefix: '',
  nullableStrategy: 'ignore',
  queryParamsSerialization: {
    allowDots: true,
    arrayFormat: 'repeat',
  },
};

/**
 * Fills in all AppOptions defaults for a partial ClientOptions object.
 * Used at the boundary between public API / test helpers and the internal pipeline.
 */
export function resolveOptions(opts: Partial<ClientOptions>): AppOptions {
  return {
    src: opts.src ?? '',
    ...opts,
    template: opts.template ?? APP_DEFAULTS.template,
    servicePrefix: opts.servicePrefix ?? APP_DEFAULTS.servicePrefix,
    nullableStrategy: opts.nullableStrategy ?? APP_DEFAULTS.nullableStrategy,
    queryParamsSerialization: {
      ...APP_DEFAULTS.queryParamsSerialization,
      ...opts.queryParamsSerialization,
    },
  };
}

/**
 * Local type that represent Operation as understood by Swaggie
 **/
export interface ApiOperation extends OA3.OperationObject {
  method: HttpMethod;
  path: string;
  group: string;
}
