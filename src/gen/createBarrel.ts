import { camel } from 'case';

import type { ApiOperation, ClientOptions } from '../types';
import { renderFile } from '../utils';

type ClientGroups = {
  [key: string]: ApiOperation[];
};

export function generateBarrelFile(clients: ClientGroups, clientOptions: ClientOptions) {
  const files = [];

  for (const name in clients) {
    files.push(name);
  }

  const viewData = {
    servicePrefix: clientOptions.servicePrefix || '',
    clients: files
      .filter((c) => c)
      .map((c) => ({
        fileName: (clientOptions.servicePrefix || '') + c,
        className: `${(clientOptions.servicePrefix || '') + c}Client`,
        camelCaseName: camel(`${(clientOptions.servicePrefix || '') + c}Client`),
      })),
  };

  return renderFile('barrel.ejs', viewData);
}
