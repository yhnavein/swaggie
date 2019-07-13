import genOperations from './genOperations';
import genTypes from './genTypes';
import { applyFormatOptions } from './support';

export default function genCode(
  spec: ApiSpec,
  operations: ApiOperation[],
  options: ClientOptions
): ApiSpec {
  applyFormatOptions(options);
  genOperations(spec, operations, options);
  genTypes(spec, options);
  return spec;
}
