import { mkdir, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';

/**
 * Computes the relative import path from `fromFile` to `toFile`, stripping the
 * file extension and ensuring the result always starts with `./` or `../`.
 *
 * @param fromFile - The file that will contain the import statement (e.g. the mock file)
 * @param toFile   - The file being imported (e.g. the generated API client file)
 *
 * @example
 * deriveRelativeImport('src/__mocks__/api.ts', 'src/generated/api.ts')
 * // → '../generated/api'
 *
 * deriveRelativeImport('src/api.mock.ts', 'src/api.ts')
 * // → './api'
 */
export function deriveRelativeImport(fromFile: string, toFile: string): string {
  const rel = relative(dirname(fromFile), toFile);
  const withoutExt = rel.replace(/\.[jt]sx?$/i, '');
  // Normalise backslashes on Windows and ensure a leading ./
  const normalised = withoutExt.replace(/\\/g, '/');
  return normalised.startsWith('.') ? normalised : './' + normalised;
}

export function saveFile(filePath: string, contents: string) {
  return new Promise((resolve, reject) => {
    mkdir(dirname(filePath), { recursive: true }, (err) => {
      if (err) {
        reject(err);
      }

      writeFileSync(filePath, contents);
      resolve(true);
    });
  });
}
