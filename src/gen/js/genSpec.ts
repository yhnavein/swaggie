import { SP, ST } from './support';
import { writeFileSync } from '../util';

export default function genSpec(spec: ApiSpec, options: ClientOptions) {
  const file = genSpecFile(spec, options);
  writeFileSync(file.path, file.contents);
}

export function genSpecFile(spec: ApiSpec, options: ClientOptions) {
  return {
    path: `${options.outDir}/gateway/spec.ts`,
    contents: renderSpecView(spec, options),
  };
}

function renderSpecView(spec: ApiSpec, options: ClientOptions): string {
  const view = {
    host: spec.host,
    schemes: spec.schemes,
    basePath: spec.basePath,
    contentTypes: spec.contentTypes,
    accepts: spec.accepts,
    securityDefinitions: spec.securityDefinitions,
  };
  const type = ': OpenApiSpec';
  return `// Auto-generated, edits will be overwritten
import { OpenApiSpec } from '../types';

const spec${type} = {
  host: '${view.host}',
  schemes: ${JSON.stringify(view.schemes)},
  basePath: '${view.basePath}',
  contentTypes: ${JSON.stringify(view.contentTypes)},
  accepts: ${JSON.stringify(view.accepts)},
}${ST}

export default spec${ST}
`;
}
