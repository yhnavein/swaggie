import * as ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';

/** Loads to memory all the EJS files for the selected template */
export function loadAllTemplateFiles(templateName: string) {
  if (!templateName) {
    throw new Error(`No template name was provided`);
  }
  const templatesDir = path.join(__dirname, '..', '..', 'templates', templateName);
  if (!fs.existsSync(templatesDir)) {
    throw new Error(
      `Could not found directory with the template (we tried ${templatesDir}). Template name is correct?`
    );
  }
  const templates = fs.readdirSync(templatesDir);

  ejs.clearCache();

  templates.forEach((t) => {
    const filePath = path.join(templatesDir, t);
    const file = fs.readFileSync(filePath, 'utf8');
    const tfun = ejs.compile(file, { cache: true });
    ejs.cache.set(t, tfun);
  });
}

/** Renders a file from the compiled template from cache */
export function render(templateFile: string, data: ejs.Data) {
  const tmpl = ejs.cache.get(templateFile);

  return tmpl(data);
}
