import fs from 'node:fs';
import path from 'node:path';
import { initTemplateEngineFromBundled, initTemplateEngineFromDirectory } from './templateEngine';
let bundledTemplates: TemplateBundleStore | null = null;

export type TemplateBundleStore = Record<string, Record<string, string>>;

export function setBundledTemplates(templates: TemplateBundleStore | null) {
  bundledTemplates = templates;
}

export function loadAllTemplateFiles(templateName: string | null) {
  if (!templateName) {
    throw new Error('No template name was provided');
  }

  if (loadFromBundledTemplates(templateName)) {
    return;
  }

  const templatesDir = fs.existsSync(templateName)
    ? templateName
    : path.join(__dirname, '..', '..', 'templates', templateName);

  if (!fs.existsSync(templatesDir)) {
    throw new Error(
      `Could not find directory with the template (we tried ${templatesDir}). Is the template name correct?`
    );
  }
  initTemplateEngineFromDirectory(templatesDir);
}

function loadFromBundledTemplates(templateName: string): boolean {
  const templateFiles = bundledTemplates?.[templateName];
  if (!templateFiles) {
    return false;
  }

  initTemplateEngineFromBundled(templateFiles);

  return true;
}
