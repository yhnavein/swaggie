import { injectable } from 'inversify';
import { ApiSpec } from '../types';

@injectable()
export class SpecFormatter {
  formatSpec(spec: ApiSpec, src?: string): ApiSpec {
    if (!spec.basePath) {
      spec.basePath = '';
    } else if (spec.basePath.endsWith('/')) {
      spec.basePath = spec.basePath.slice(0, -1);
    }

    if (src && /^https?:\/\//im.test(src)) {
      const parts = src.split('/');
      if (!spec.host) {
        spec.host = parts[2];
      }
      if (!spec.schemes || !spec.schemes.length) {
        spec.schemes = [parts[0].slice(0, -1)];
      }
    } else {
      if (!spec.host) {
        spec.host = 'localhost';
      }
      if (!spec.schemes || !spec.schemes.length) {
        spec.schemes = ['http'];
      }
    }

    // TODO: why any? why consumes -> contentTypes?
    const s: any = spec;
    if (!s.produces || !s.produces.length) {
      s.accepts = ['application/json']; // give sensible default
    } else {
      s.accepts = s.produces;
    }

    if (!s.consumes) {
      s.contentTypes = [];
    } else {
      s.contentTypes = s.consumes;
    }

    delete s.consumes;
    delete s.produces;

    return spec;
  }
}
