import genOperations from './genOperations';
import genTypes from './genTypes';

export default function genCode(
  spec: ApiSpec,
  operations: ApiOperation[],
  options: ClientOptions
): ApiSpec {
  genOperations(spec, operations, options);
  genTypes(spec, options);
  return spec;
}
