import genOperations from './genOperations';
import genTypes from './genTypes';
import { saveFile, prepareOutputFilename } from '../util';

export default async function genCode(
  spec: ApiSpec,
  operations: ApiOperation[],
  options: ClientOptions
): Promise<ApiSpec> {
  let [fileContents, queryDefinitions] = await genOperations(spec, operations, options);
  fileContents += genTypes(spec, queryDefinitions, options);

  const destFile = prepareOutputFilename(options.out);
  saveFile(destFile, fileContents);
  return spec;
}
