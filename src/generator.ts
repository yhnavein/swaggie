import { injectable, inject } from 'inversify';
import assert = require('assert');
import { SpecResolver } from './spec/spec-resolver';
import { OperationsParser } from './spec';
import { CodeGenerator } from './gen/js';
import { DirectoryCleaner } from './common/directory-cleaner';
import { ClientOptions } from './types';
import { TYPES } from './ioc/types';

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
