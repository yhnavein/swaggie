import type { OpenAPIV3 as OA3 } from 'openapi-types';

import generateOperations from './genOperations';
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
    await saveFile(destFile, fileContents);
  }

  if (options.mocks && options.testingFramework && options.out) {
    const resolvedMocksPath = prepareOutputFilename(options.mocks);
    const resolvedOutPath = prepareOutputFilename(options.out);
    const relativeApiImport = deriveRelativeImport(resolvedMocksPath, resolvedOutPath);
    const mockContents = generateMocks(spec, options, relativeApiImport);
    await saveFile(resolvedMocksPath, mockContents);
  }

  return fileContents;
}
