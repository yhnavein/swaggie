import type { AppOptions, FullAppOptions } from './types';

export type CodeGenResult = [string, AppOptions];

/**
 * Runs the whole code generation process @returns `CodeGenResult`
 **/
export declare function runCodeGenerator(options: Partial<FullAppOptions>): Promise<CodeGenResult>;
