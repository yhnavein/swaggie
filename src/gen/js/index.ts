import type { OpenAPIV3 as OA3 } from 'openapi-types';

import genOperations from './genOperations';
import genTypes from './genTypes';
import { saveFile, prepareOutputFilename } from '../util';
import type { ApiOperation, ClientOptions } from '../../types';

export default async function genCode(
  spec: OA3.Document,
  operations: ApiOperation[],
  options: ClientOptions
): Promise<string> {
  let fileContents = await genOperations(spec, operations, options);
  fileContents += genTypes(spec, options);

  if (options.out) {
    const destFile = prepareOutputFilename(options.out);
    await saveFile(destFile, fileContents);
  }

  return fileContents;
}
