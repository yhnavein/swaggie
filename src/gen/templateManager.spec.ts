import os from 'os';
import fs from 'fs';
import path from 'path';
import * as ejs from 'ejs';
import { loadAllTemplateFiles, renderFile } from './templateManager';

const GOOD_FILE = 'client.ejs';

describe('loadAllTemplateFiles', () => {
  beforeEach(() => ejs.clearCache());
  it('should load all template files to the memory', async () => {
    loadAllTemplateFiles('axios');

    expect(ejs.cache).toBeDefined();
    expect(ejs.cache.get(GOOD_FILE)).toBeInstanceOf(Function);
  });

  it('should handle loading wrong template', async () => {
    expect(() => {
      loadAllTemplateFiles('non-existent');
    }).toThrowError('Could not found');
  });

  it('should handle empty template name', async () => {
    expect(() => {
      loadAllTemplateFiles('');
    }).toThrowError('No template');
  });

  it('should handle null template', async () => {
    expect(() => {
      loadAllTemplateFiles(null);
    }).toThrowError('No template');
  });

  it('should handle custom template', async () => {
    const tempDir = `${os.tmpdir()}/custom-template`;

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    fs.copyFileSync(
      path.join(__dirname, '..', '..', 'templates', 'fetch', 'client.ejs'),
      path.join(tempDir, 'client.ejs')
    );

    loadAllTemplateFiles(tempDir);

    expect(ejs.cache).toBeDefined();
    expect(ejs.cache.get(GOOD_FILE)).toBeInstanceOf(Function);

    fs.unlinkSync(path.join(tempDir, 'client.ejs'));
    fs.rmdirSync(tempDir);
  });

  it('actually clears EJS cache', async () => {
    loadAllTemplateFiles('axios');
    expect(ejs.cache.get(GOOD_FILE)).toBeDefined();

    ejs.clearCache();

    expect(ejs.cache.get(GOOD_FILE)).not.toBeDefined();
  });
});

describe('render', () => {
  beforeAll(() => {
    ejs.clearCache();
    loadAllTemplateFiles('axios');
  });

  it('should get existing template', async () => {
    const templateFunction = renderFile(GOOD_FILE, {
      clientName: 'Test',
      varName: 'test',
      baseUrl: null,
      operations: [],
    });

    expect(templateFunction).toContain('testClient');
  });

  it('should render template that is complex (multiple levels of includes)', async () => {
    const templateFunction = renderFile(GOOD_FILE, {
      clientName: 'Test',
      varName: 'test',
      baseUrl: null,
      operations: [
        {
          parameters: [],
          name: 'TestName',
          returnType: 'string',
          url: 'api/test',
          pathParams: [],
          method: 'GET',
          formData: [],
          body: null,
          query: null,
          headers: null,
        },
      ],
    });

    expect(templateFunction).toContain('testClient');
    expect(templateFunction).toContain('TestName');
  });
});
