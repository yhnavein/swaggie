import { camelCase } from 'lodash';
import { renderFile } from '../templateManager';

export async function generateBarrelFile(clients: any[], clientOptions: ClientOptions) {
  const files = [];

  for (let name in clients) {
    files.push(name);
  }

  const viewData = {
    servicePrefix: clientOptions.servicePrefix || '',
    clients: files
      .filter((c) => c)
      .map((c) => ({
        fileName: (clientOptions.servicePrefix || '') + c,
        className: (clientOptions.servicePrefix || '') + c + 'Client',
        camelCaseName: camelCase((clientOptions.servicePrefix || '') + c + 'Client'),
      })),
  };

  return renderFile('barrel.ejs', viewData);
}
