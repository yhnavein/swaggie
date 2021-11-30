import { expect } from 'chai';
import { runCodeGenerator, applyConfigFile, verifySpec } from './index';

describe('runCodeGenerator', () => {
  it('fails with no parameters provided', () => {
    const parameters = {};

    return runCodeGenerator(parameters as any).catch((e) =>
      expect(e).to.contain('You need to provide')
    );
  });

  it('fails with only --out provided', () => {
    const parameters = {
      out: './.tmp/test/',
    };

    return runCodeGenerator(parameters as any).catch((e) =>
      expect(e).to.contain('You need to provide')
    );
  });

  it('fails with only --src provided', () => {
    const parameters = {
      src: 'https://google.pl',
    };

    return runCodeGenerator(parameters as any).catch((e) =>
      expect(e).to.contain('You need to provide')
    );
  });

  it('works with --out and --src provided', () => {
    const parameters = {
      src: 'http://petstore.swagger.io/v2/swagger.json',
      out: './.tmp/test/',
    };

    runCodeGenerator(parameters as any).then((res) => {
      expect(res).to.be.ok;
    });
  });

  it('fails when wrong --config provided', (done) => {
    const parameters = {
      config: './test/nonexistent-config.json',
    };

    runCodeGenerator(parameters as any)
      .then(() => {})
      .catch((e) => expect(e).to.contain('Could not correctly load config file'))
      .finally(() => done());
  });

  it('fails when --config provided and the JSON file is wrong', () => {
    const parameters = {
      config: './test/petstore.yml',
    };

    return runCodeGenerator(parameters as any).catch((e) =>
      expect(e).to.contain('Could not correctly load config file')
    );
  });

  it('works with proper --config provided', (done) => {
    const parameters = {
      config: './test/sample-config.json',
    };

    runCodeGenerator(parameters as any)
      .then((res) => {
        expect(res).to.be.ok;
      })
      .finally(() => done());
  });

  it('properly loads configuration from config file', async () => {
    const parameters = {
      config: './test/sample-config.json',
    };
    const conf = await applyConfigFile(parameters as any);
    expect(conf).to.be.ok;
    expect(conf.baseUrl).to.be.equal('https://google.pl');
    expect(conf.src).to.be.equal('https://petstore.swagger.io/v2/swagger.json');
  });

  it('makes inline parameters higher priority than from config file', async () => {
    const parameters = {
      config: './test/sample-config.json',
      baseUrl: 'https://wp.pl',
      src: './test/petstore.yml',
    };
    const conf = await applyConfigFile(parameters as any);
    expect(conf).to.be.ok;
    expect(conf.baseUrl).to.be.equal('https://wp.pl');
    expect(conf.src).to.be.equal('./test/petstore.yml');
  });

  it('fails when OpenAPI3 is provided', (done) => {
    const res = verifySpec({
      openapi: '3.0.2',
      paths: {},
    } as any);

    res
      .then(() => {})
      .catch((e) => {
        expect(e).to.contain('Spec does not look like');
      })
      .finally(() => done());
  });
});
