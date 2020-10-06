import ejs from 'ejs';
import fs from 'fs';
import path from 'path';

/** Loads to memory all the EJS files for the selected template */
export function loadAllTemplateFiles(templateName: string) {
  if (!templateName) {
    throw new Error(`No template name was provided`);
  }
  const templatesDir = fs.existsSync(templateName)
    ? templateName
    : path.join(__dirname, '..', '..', 'templates', templateName);
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
    const tfun = ejs.compile(file, { cache: true, client: true });
    ejs.cache.set(t, tfun);
  });
}

/** Renders a file from the compiled template from cache */
export function renderFile(templateFile: string, data: ejs.Data) {
  const fun = ejs.cache.get(templateFile) as any;

  return fun(data, null, (path: string, d: ejs.Data) => {
    const insideTemplateName = path + (path.match(/\.ejs$/i) ? '' : '.ejs');
    return renderFile(insideTemplateName, d);
  });
}
