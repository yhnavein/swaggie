import os from 'os';
import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import { loadAllTemplateFiles, renderFile } from './templateManager';

const GOOD_FILE = 'client.ejs';

describe('loadAllTemplateFiles', () => {
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
});

describe('render', () => {
  beforeEach(() => {
    loadAllTemplateFiles('axios');
  });

  it('should get existing template', () => {
    const templateFunction = renderFile(GOOD_FILE, {
      clientName: 'Test',
      camelCaseName: 'test',
      baseUrl: null,
      operations: [],
    });

    expect(templateFunction).to.contain('testClient');
  });

  it('should render template that is complex (multiple levels of includes)', () => {
    const templateFunction = renderFile(GOOD_FILE, {
      clientName: 'Test',
      camelCaseName: 'test',
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

describe('custom templates', () => {
  const tempDir = `${os.tmpdir()}/custom-template`;

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    fs.copyFileSync(
      path.join(__dirname, '..', '..', 'templates', 'fetch', 'client.ejs'),
      path.join(tempDir, 'client.ejs')
    );

    loadAllTemplateFiles(tempDir);
  });

  it('should handle custom template', () => {
    const templateFunction = renderFile('client.ejs', {
      clientName: 'Test',
      camelCaseName: 'test',
      baseUrl: null,
      operations: [],
    });

    expect(templateFunction).to.contain('testClient');
  });

  afterEach(() => {
    fs.unlinkSync(path.join(tempDir, 'client.ejs'));
    fs.rmdirSync(tempDir);
  });
});
