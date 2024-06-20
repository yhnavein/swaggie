import genOperations from './genOperations';
import genTypes from './genTypes';
import { saveFile, prepareOutputFilename } from '../util';
import type { ApiOperation, ApiSpec, ClientOptions } from '../../types';

export default async function genCode(
  spec: ApiSpec,
  operations: ApiOperation[],
  options: ClientOptions
): Promise<string> {
  let [fileContents, queryDefinitions] = await genOperations(spec, operations, options);
  fileContents += genTypes(spec, queryDefinitions, options);

  if (options.out) {
    const destFile = prepareOutputFilename(options.out);
    await saveFile(destFile, fileContents);
  }

  return fileContents;
}
