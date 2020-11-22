import { camelCase } from 'lodash';
import { renderFile } from '../templateManager';

export function generateBarrelFile(clients: any[], clientOptions: ClientOptions): string {
  const files = [];

  // tslint:disable-next-line:forin prefer-const
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
        varName: camelCase((clientOptions.servicePrefix || '') + c + 'Client'),
      })),
  };

  return renderFile('barrel.ejs', viewData);
}
