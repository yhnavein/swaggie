import type { OpenAPIV3 } from 'openapi-types';
import type { ClientOptions, FullAppOptions } from '../src/types';

/** Runs whole code generation process. @returns generated code */
export declare function runCodeGenerator(options: FullAppOptions): Promise<string>;
/** Validates if the spec is correct and if is supported */
export declare function verifySpec(spec: OpenAPIV3.Document): Promise<OpenAPIV3.Document>;
export declare function applyConfigFile(options: FullAppOptions): Promise<ClientOptions>;
