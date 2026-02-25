import type { OpenAPIV3 } from 'openapi-types';
import type { ClientOptions, FullAppOptions } from './types';

export type CodeGenResult = [string, AppOptions];

/**
 * Runs the whole code generation process @returns `CodeGenResult`
 **/
export declare function runCodeGenerator(options: Partial<FullAppOptions>): Promise<CodeGenResult>;
