// Stub for node:fs — eta references these paths but never calls them in browser mode
export const readFileSync = () => { throw new Error('readFileSync is not available in the browser'); };
export default { readFileSync };
