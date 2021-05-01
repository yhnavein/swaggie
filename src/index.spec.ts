import { runCodeGenerator, applyConfigFile, verifySpec } from './index';

describe('runCodeGenerator', () => {
  it('fails with no parameters provided', () => {
    const parameters = {};

    return runCodeGenerator(parameters as any).catch((e) =>
      expect(e).toContain('You need to provide')
    );
  });

  it('fails with only --out provided', () => {
    const parameters = {
      out: './.tmp/test/',
    };

    return runCodeGenerator(parameters as any).catch((e) =>
      expect(e).toContain('You need to provide')
    );
  });

  it('fails with only --src provided', () => {
    const parameters = {
      src: 'https://google.pl',
    };

    return runCodeGenerator(parameters as any).catch((e) =>
      expect(e).toContain('You need to provide')
    );
  });

  it('works with --out and --src provided', () => {
    const parameters = {
      src: 'http://petstore.swagger.io/v2/swagger.json',
      out: './.tmp/test/',
    };

    return expect(runCodeGenerator(parameters as any)).resolves.toBeDefined();
  });

  it('fails when wrong --config provided', () => {
    const parameters = {
      config: './test/nonexistent-config.json',
    };

    return runCodeGenerator(parameters as any).catch((e) =>
      expect(e).toContain('Could not correctly load config file')
    );
  });

  it('fails when --config provided and the JSON file is wrong', () => {
    const parameters = {
      config: './test/petstore.yml',
    };

    return runCodeGenerator(parameters as any).catch((e) =>
      expect(e).toContain('Could not correctly load config file')
    );
  });

  it('works with proper --config provided', () => {
    const parameters = {
      config: './test/sample-config.json',
    };

    return expect(runCodeGenerator(parameters as any)).resolves.toBeDefined();
  });

  it('properly loads configuration from config file', async () => {
    const parameters = {
      config: './test/sample-config.json',
    };
    const conf = await applyConfigFile(parameters as any);
    expect(conf).toBeDefined();
    expect(conf.baseUrl).toBe('https://google.pl');
    expect(conf.src).toBe('https://petstore.swagger.io/v2/swagger.json');
  });

  it('makes inline parameters higher priority than from config file', async () => {
    const parameters = {
      config: './test/sample-config.json',
      baseUrl: 'https://wp.pl',
      src: './test/petstore.yml',
    };
    const conf = await applyConfigFile(parameters as any);
    expect(conf).toBeDefined();
    expect(conf.baseUrl).toBe('https://wp.pl');
    expect(conf.src).toBe('./test/petstore.yml');
  });

  it('fails when OpenAPI3 is provided', () => {
    const res = verifySpec({
      openapi: '3.0.2',
      paths: {},
    } as any);

    expect(res).rejects.toContain('Spec does not look like');
  });
});
