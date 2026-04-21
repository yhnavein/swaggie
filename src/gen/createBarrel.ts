import { camel } from 'case';

import type { ApiOperation, AppOptions } from '../types';
import { renderFile } from '../utils/templateEngine';

type ClientGroups = {
  [key: string]: ApiOperation[];
};

export function generateBarrelFile(clients: ClientGroups, clientOptions: AppOptions) {
  const files = [];

  for (const name in clients) {
    files.push(name);
  }

  const viewData = {
    servicePrefix: clientOptions.servicePrefix,
    allowDots: clientOptions.queryParamsSerialization.allowDots,
    arrayFormat: clientOptions.queryParamsSerialization.arrayFormat,
    clients: files
      .filter((c) => c)
      .map((c) => ({
        fileName: clientOptions.servicePrefix + c,
        className: `${clientOptions.servicePrefix + c}Client`,
        camelCaseName: camel(`${clientOptions.servicePrefix + c}Client`),
      })),
  };

  return renderFile('barrel.ejs', viewData);
}
