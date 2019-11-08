import { camelCase } from 'lodash';
import { render } from '../templateManager';

export function generateBarrelFile(clients: any[], clientOptions: ClientOptions): Promise<string> {
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

  return new Promise((res, rej) => res(render('barrel.ejs', viewData)));
}
