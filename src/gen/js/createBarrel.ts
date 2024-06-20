import { camel } from 'case';
import type { ClientOptions } from '../../types';
import { renderFile } from '../templateManager';

export async function generateBarrelFile(clients: any[], clientOptions: ClientOptions) {
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
