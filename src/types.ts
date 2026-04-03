import type { OpenAPIV3 as OA3 } from 'openapi-types';

interface QueryParamsSerializationOptions {
  allowDots?: boolean;
  arrayFormat?: ArrayFormat;
  queryParamsAsObject?: boolean | number;
}

export interface ClientOptions {
  /**
   * Path or URL to the Swagger specification file (JSON or YAML).
   * Alternatively you can provide parsed object here instead
   **/
  src: string | object;
  /** Path to the file which will contain generated TypeScript code */
  out?: string;
  /**
   * Template to be used for code generation.
   * Can be a single L1 template name (e.g. "axios"), a single L2 template name
   * (e.g. "swr" — defaults to "fetch" as the L1), or a 2-element tuple of
   * [L2, L1] (e.g. ["swr", "axios"]).
   * Custom filesystem paths are also accepted in any position.
   */
  template: TemplateInput;
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

  /** Controls whether to generate full client code or only component schemas */
  generationMode?: GenerationMode;
  /** Controls whether object schemas are emitted as interfaces or type aliases */
  schemaDeclarationStyle?: SchemaDeclarationStyle;
  /** Controls whether plain string enums are emitted as unions or TypeScript enums */
  enumDeclarationStyle?: EnumDeclarationStyle;
  /**
   * Controls how enum member names are formatted when generating TypeScript `enum` declarations.
   * Only applies when `enumDeclarationStyle` is set to `'enum'`.
   * - `'original'` — use the raw enum value as the member name (e.g. `org name = "org name"`)
   * - `'PascalCase'` — convert values to PascalCase (e.g. `OrgName = "org name"`)
   */
  enumNamesStyle?: EnumNamesStyle;

  /**
   * Prepends `'use client';` as the very first line of the generated file.
   * Required for Next.js App Router when using SWR or TanStack Query hooks,
   * which can only run in Client Components.
   * Has no effect and should not be used with non-RSC environments.
   */
  useClient?: boolean;

  /**
   * Output path for the generated mock/stub file. Requires `testingFramework`
   * and `out` to also be set. When provided, a companion mock file is generated
   * alongside the main client, exporting typed spy stubs for every operation.
   */
  mocks?: string;

  /**
   * The test framework to use for generated mock stubs.
   * - `'vitest'` — uses `vi.fn()` from `vitest`
   * - `'jest'`   — uses `jest.fn()` from `@jest/globals`
   * Requires `mocks` and `out` to also be set.
   */
  testingFramework?: TestingFramework;

  /** Offers ability to adjust the OpenAPI spec before it is processed */
  modifiers?: {
    /** Global-level modifiers for parameter with a given name */
    parameters?: {
      [key: string]: 'optional' | 'required' | 'ignore';
    };
  };
}

export interface CliOptions extends Omit<FullAppOptions, 'enumNamesStyle'> {
  allowDots?: boolean;
  arrayFormat?: ArrayFormat;
  queryParamsAsObject?: boolean | number;
  mode?: GenerationMode;
  schemaStyle?: SchemaDeclarationStyle;
  enumStyle?: EnumDeclarationStyle;
  /** Accepts 'original', 'PascalCase', or 'pascal' (normalized to 'PascalCase') */
  enumNamesStyle?: string;
  nullables?: NullableStrategy;
  mocks?: string;
  testingFramework?: TestingFramework;
}

export interface FullAppOptions extends ClientOptions {
  /** Path to the configuration file that contains actual config to be used */
  config?: string;
}

/** HTTP client templates (standalone, no reactive layer) */
export type L1Template = 'axios' | 'fetch' | 'xior' | 'ng1' | 'ng2';
/** Reactive query layer templates (must be composed with an L1 template) */
export type L2Template = 'swr' | 'tsq';
/** Any named built-in template */
export type Template = L1Template | L2Template;
/**
 * What the user may supply as a `template` value:
 * - a single template name or custom path string
 * - a [L2, L1] pair (names or custom paths)
 */
export type TemplateInput = Template | string | [string, string];
/**
 * After normalization inside prepareAppOptions the template is always
 * either a single L1 string or a resolved [L2, L1] pair.
 */
export type ResolvedTemplate = L1Template | string | [string, string];
export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch';
export type DateSupport = 'string' | 'Date';
export type ArrayFormat = 'indices' | 'repeat' | 'brackets';
export type NullableStrategy = 'include' | 'nullableAsOptional' | 'ignore';
export type GenerationMode = 'full' | 'schemas';
export type SchemaDeclarationStyle = 'interface' | 'type';
export type EnumDeclarationStyle = 'union' | 'enum';
export type EnumNamesStyle = 'original' | 'PascalCase';
export type TestingFramework = 'vitest' | 'jest';

/**
 * Internal options type used throughout the app after `prepareAppOptions` has run.
 * All fields that have defaults are required here so the rest of the codebase never
 * needs to perform its own `?? fallback` logic.
 */
export interface AppOptions extends ClientOptions {
  template: ResolvedTemplate;
  servicePrefix: string;
  nullableStrategy: NullableStrategy;
  generationMode: GenerationMode;
  schemaDeclarationStyle: SchemaDeclarationStyle;
  enumDeclarationStyle: EnumDeclarationStyle;
  enumNamesStyle: EnumNamesStyle;
  queryParamsSerialization: {
    allowDots: boolean;
    arrayFormat: ArrayFormat;
    queryParamsAsObject: boolean | number;
  };
  mocks?: string;
  testingFramework?: TestingFramework;
}

/**
 * Local type that represent Operation as understood by Swaggie
 **/
export interface ApiOperation extends OA3.OperationObject {
  method: HttpMethod;
  path: string;
  group: string;
}
