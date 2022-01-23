import { ApiSpec, ClientOptions, FullAppOptions } from './types';
/** Runs whole code generation process. @returns generated code */
export declare function runCodeGenerator(options: FullAppOptions): Promise<string>;
/** Validates if the spec is correct and if is supported */
export declare function verifySpec(spec: ApiSpec): Promise<ApiSpec>;
export declare function applyConfigFile(options: FullAppOptions): Promise<ClientOptions>;
