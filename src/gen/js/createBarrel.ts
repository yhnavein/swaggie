import { camelCase } from 'lodash';
import { renderFile } from '../templateManager';

export function generateBarrelFile(clients: any[], clientOptions: ClientOptions): string {
  const files = [];

  // tslint:disable-next-line:forin prefer-const
  for (let name in clients) {
    files.push(name);
  }

  const viewData = {
    reactContexts: clientOptions.reactHooks || false,
    clients: files
      .filter((c) => c)
      .map((c) => ({
        fileName: c,
        className: c + 'Client',
        varName: camelCase(c + 'Client'),
      })),
  };

  return renderFile('barrel.ejs', viewData);
}
