// Stub for node:path — eta references these paths but never calls them in browser mode
export const extname = () => '';
export const join = (...parts: string[]) => parts.join('/');
export const dirname = (p: string) => p.split('/').slice(0, -1).join('/');
export const relative = () => '';
export const isAbsolute = () => false;
export default { extname, join, dirname, relative, isAbsolute };
