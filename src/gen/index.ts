import type { OpenAPIV3 as OA3 } from 'openapi-types';

import generateOperations from './genOperations';
import generateTypes from './genTypes';
import { saveFile, prepareOutputFilename } from '../utils';
import type { ClientOptions } from '../types';

export default async function generateCode(
  spec: OA3.Document,
  options: ClientOptions
): Promise<string> {
  let fileContents = await generateOperations(spec, options);
  fileContents += generateTypes(spec, options);

  if (options.out) {
    const destFile = prepareOutputFilename(options.out);
    await saveFile(destFile, fileContents);
  }

  return fileContents;
}
