import assert = require('assert');
import { inject, injectable } from 'inversify';

import { DirectoryCleaner } from './common';
import { CodeGenerator } from './gen';
import { TYPES } from './ioc/types';
import { OperationsParser } from './spec';
import { SpecResolver } from './spec/spec-resolver';
import { ClientOptions } from './types';

@injectable()
export class Generator {
  constructor(
    @inject(TYPES.SpecResolver) private readonly specResolver: SpecResolver,
    @inject(TYPES.OperationsParser) private readonly operationsParser: OperationsParser,
    @inject(TYPES.DirectoryCleaner) private readonly directoryCleaner: DirectoryCleaner,
    @inject(TYPES.CodeGenerator) private readonly codeGenerator: CodeGenerator,
  ) { }

  async generateCode(options: ClientOptions) {
    await this.verifyOptions(options);
    // TODO: ignoreRefType is ignored inside resolveSpec
    const spec = await this.specResolver.resolveSpec(options.src, { ignoreRefType: '#/definitions/' });

    const operations = this.operationsParser.getOperations(spec);
    await this.directoryCleaner.removeOldFiles(options);
    return this.codeGenerator.generate(spec, operations, options);
  }

  // TODO: utilise proper args validator
  private verifyOptions(options: ClientOptions) {
    assert.ok(options.src, 'Open API src not specified');
    assert.ok(options.outDir, 'Output directory not specified');
  }
}
