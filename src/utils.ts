/** This method tries to fix potentially wrong out parameter given from commandline */
export function prepareOutputFilename(out: string): string {
  if (!out) {
    return null;
  }

  if (/\.[jt]sx?$/i.test(out)) {
    return out.replace(/[\\]/i, '/');
  }
  if (/[\/\\]$/i.test(out)) {
    return out.replace(/[\/\\]$/i, '') + '/index.ts';
  }
  return out.replace(/[\\]/i, '/') + '.ts';
}
