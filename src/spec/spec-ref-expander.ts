import { injectable, inject } from 'inversify';
import { SpecOptions } from './types';
import { TYPES } from '../ioc/types';

@injectable()
export class SpecRefExpander {
  dataCache: Set<any>;

  constructor(
    @inject(TYPES.SetFactory) setFactory: () => Set<any>,
  ) {
    this.dataCache = setFactory();
  }

  /**
   * Recursively expand internal references in the form `#/path/to/object`.
   *
   * @param {object} data the object to search for and update refs
   * @param {object} lookup the object to clone refs from
   * @param {RegExp} refMatch an optional regex to match specific refs to resolve
   * @returns {object} the resolved data object
   */
  expandRefs(data: any, lookup: object, options: SpecOptions): any {
    if (!data) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.expandRefs(item, lookup, options));
    } else if (typeof data === 'object') {
      if (this.dataCache.has(data)) {
        return data;
      }
      if (data.$ref && !(options.ignoreRefType && data.$ref.startsWith(options.ignoreRefType))) {
        const resolved = this.expandRef(data.$ref, lookup);
        delete data.$ref;
        data = Object.assign({}, resolved, data);
      }
      this.dataCache.add(data);

      // TODO: unsafe for...in
      // tslint:disable-next-line:forin
      for (const name in data) {
        // if (data.hasOwnProperty(name)) {
        data[name] = this.expandRefs(data[name], lookup, options);
        // }
      }
    }
    return data;
  }

  expandRef(ref: string, lookup: object): any {
    const parts = ref.split('/');
    if (parts.shift() !== '#' || !parts[0]) {
      throw new Error(`Only support JSON Schema $refs in format '#/path/to/ref'`);
    }
    let value = lookup;
    while (parts.length) {
      value = value[parts.shift()];
      if (!value) {
        throw new Error(`Invalid schema reference: ${ref}`);
      }
    }
    return value;
  }
}
