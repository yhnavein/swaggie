import { existsSync, mkdir, writeFileSync } from 'node:fs';
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

/**
 * Writes `contents` to `filePath` only when the file does not already exist,
 * or when `force` is `true`. Useful for write-once scaffold files that should
 * survive re-generation without losing user edits.
 *
 * @returns `'written'` when the file was created/overwritten, `'skipped'` when
 *          it already existed and `force` was not set.
 */
export async function saveFileIfMissing(
  filePath: string,
  contents: string,
  force = false
): Promise<'written' | 'skipped'> {
  if (!force && existsSync(filePath)) {
    return 'skipped';
  }
  await saveFile(filePath, contents);
  return 'written';
}
