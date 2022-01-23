import { ApiSpec, ClientOptions, FullAppOptions } from './types';
export declare function runCodeGenerator(options: FullAppOptions): Promise<any>;
export declare function verifySpec(spec: ApiSpec): Promise<ApiSpec>;
export declare function applyConfigFile(options: FullAppOptions): Promise<ClientOptions>;
