import os from 'os';
import fs from 'fs';
import path from 'path';
import * as ejs from 'ejs';
import { expect } from 'chai';
import { loadAllTemplateFiles, renderFile } from './templateManager';

const GOOD_FILE = 'client.ejs';

describe('loadAllTemplateFiles', () => {
  beforeEach(() => ejs.clearCache());
  it('should load all template files to the memory', async () => {
    loadAllTemplateFiles('axios');

    expect(ejs.cache).to.be.ok;
    expect(ejs.cache.get(GOOD_FILE)).to.be.a('function');
  });

  it('should handle loading wrong template', async () => {
    expect(() => {
      loadAllTemplateFiles('non-existent');
    }).to.throw('Could not found');
  });

  it('should handle empty template name', async () => {
    expect(() => {
      loadAllTemplateFiles('');
    }).to.throw('No template');
  });

  it('should handle null template', async () => {
    expect(() => {
      loadAllTemplateFiles(null);
    }).to.throw('No template');
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

    expect(ejs.cache).to.be.ok;
    expect(ejs.cache.get(GOOD_FILE)).to.be.a('function');

    fs.unlinkSync(path.join(tempDir, 'client.ejs'));
    fs.rmdirSync(tempDir);
  });

  it('actually clears EJS cache', async () => {
    loadAllTemplateFiles('axios');
    expect(ejs.cache.get(GOOD_FILE)).to.be.ok;

    ejs.clearCache();

    expect(ejs.cache.get(GOOD_FILE)).not.to.be.ok;
  });
});

describe('render', () => {
  beforeEach(() => {
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

    expect(templateFunction).to.contain('testClient');
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

    expect(templateFunction).to.contain('testClient');
    expect(templateFunction).to.contain('TestName');
  });
});
