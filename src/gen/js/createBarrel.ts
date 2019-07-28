import * as ejs from 'ejs';
import * as path from 'path';
import { camelCase } from 'lodash';

export function generateBarrelFile(clients: any[], clientOptions: ClientOptions): Promise<string> {
  const files = [];

  // tslint:disable-next-line:forin prefer-const
  for (let name in clients) {
    files.push(name);
  }

  const absPath = path.join(__dirname, '..', '..', '..', 'templates', 'axios', 'barrel.ejs');
  const viewData = {
    reactContexts: true,
    clients: files
      .filter((c) => c)
      .map((c) => ({
        fileName: c,
        className: c + 'Client',
        varName: camelCase(c + 'Client'),
      })),
  };

  return new Promise((res, rej) =>
    ejs.renderFile(absPath, viewData, (err, str) => {
      if (err) {
        console.error(err);
        rej(err);
      }
      res(str);
    })
  );
}
