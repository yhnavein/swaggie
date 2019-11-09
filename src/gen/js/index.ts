import genOperations from './genOperations';
import genTypes from './genTypes';
import { saveFile } from '../util';

export default function genCode(
  spec: ApiSpec,
  operations: ApiOperation[],
  options: ClientOptions
): ApiSpec {
  let fileContents = genOperations(spec, operations, options);
  fileContents += genTypes(spec, options);

  // const destFile = options.out
  saveFile(`${options.out}/index.ts`, fileContents);
  return spec;
}
