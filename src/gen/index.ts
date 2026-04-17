import type { OpenAPIV3 as OA3 } from 'openapi-types';

import generateOperations, { generateHooks } from './genOperations';
import generateMocks from './genMocks';
import generateTypes from './genTypes';
import { FILE_HEADER } from './header';
import { saveFile, prepareOutputFilename, deriveRelativeImport } from '../utils';
import type { AppOptions } from '../types';

export { FILE_HEADER } from './header';

export default async function generateCode(
  spec: OA3.Document,
  options: AppOptions
): Promise<string> {
  let fileContents = '';

  if (options.generationMode === 'schemas') {
    fileContents = FILE_HEADER + generateTypes(spec, options, false);
  } else {
    fileContents = await generateOperations(spec, options);
    fileContents += generateTypes(spec, options);
  }

  if (options.out) {
    const destFile = prepareOutputFilename(options.out);
    if (destFile) {
      await saveFile(destFile, fileContents);
    }
  }

  // Generate the hooks file when --hooksOut is set (L2 templates only)
  if (options.hooksOut && options.out) {
    const resolvedHooksPath = prepareOutputFilename(options.hooksOut);
    const resolvedOutPath = prepareOutputFilename(options.out);
    if (resolvedHooksPath && resolvedOutPath) {
      const relativeMainImport = deriveRelativeImport(resolvedHooksPath, resolvedOutPath);
      const hooksContents = await generateHooks(spec, options, relativeMainImport);
      await saveFile(resolvedHooksPath, hooksContents);
    }
  }

  if (options.mocks && options.testingFramework && options.out) {
    const resolvedMocksPath = prepareOutputFilename(options.mocks);
    const resolvedOutPath = prepareOutputFilename(options.out);
    const resolvedHooksPath = options.hooksOut
      ? prepareOutputFilename(options.hooksOut)
      : null;
    if (resolvedMocksPath && resolvedOutPath) {
      const relativeApiImport = deriveRelativeImport(resolvedMocksPath, resolvedOutPath);
      const relativeHooksImport = resolvedHooksPath
        ? deriveRelativeImport(resolvedMocksPath, resolvedHooksPath)
        : undefined;
      const mockContents = generateMocks(spec, options, relativeApiImport, relativeHooksImport);
      await saveFile(resolvedMocksPath, mockContents);
    }
  }

  return fileContents;
}
