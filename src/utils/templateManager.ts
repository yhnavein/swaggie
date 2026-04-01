import fs from 'node:fs';
import path from 'node:path';
import { initTemplateEngineFromBundled, initTemplateEngineFromDirectory } from './templateEngine';
import type { ResolvedTemplate } from '../types';

let bundledTemplates: TemplateBundleStore | null = null;

export type TemplateBundleStore = Record<string, Record<string, string>>;

export function setBundledTemplates(templates: TemplateBundleStore | null) {
  bundledTemplates = templates;
}

/**
 * Loads template files for the given template spec and initializes the
 * template engine.
 *
 * Accepts:
 * - A single template name or filesystem path (L1 or custom).
 * - A [L2, L1] tuple: the two template sets are merged, with L2 winning on
 *   filename conflicts except for `baseClient.ejs` which is stored as
 *   `baseClientL2.ejs` so that both L1 and L2 base clients can be rendered.
 */
export function loadAllTemplateFiles(template: ResolvedTemplate | null) {
  if (!template) {
    throw new Error('No template name was provided');
  }

  if (Array.isArray(template)) {
    const [l2, l1] = template;
    const l1Files = resolveTemplateFiles(l1);
    const l2Files = resolveTemplateFiles(l2);

    if (!l1Files || !l2Files) {
      // At least one side was a filesystem path — use directory overlay
      loadCompositeFromFilesystem(l2, l1);
      return;
    }

    // Both sides are bundled: merge in memory
    const merged = mergeTemplateFiles(l1Files, l2Files);
    initTemplateEngineFromBundled(merged);
    return;
  }

  // Single template
  if (!loadFromBundledTemplates(template)) {
    loadFromFilesystem(template);
  }
}

/**
 * Merges L1 and L2 file sets.  L2 wins on filename conflicts, EXCEPT that
 * `baseClient.ejs` from L2 is stored under the key `baseClientL2.ejs` so
 * both L1 and L2 base clients can be rendered independently.
 */
export function mergeTemplateFiles(
  l1Files: Record<string, string>,
  l2Files: Record<string, string>
): Record<string, string> {
  const merged: Record<string, string> = { ...l1Files };

  for (const [name, content] of Object.entries(l2Files)) {
    if (name === 'baseClient.ejs') {
      merged['baseClientL2.ejs'] = content;
    } else {
      merged[name] = content;
    }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Returns the bundled file map for a named template, or null if the name
 * refers to a filesystem path (i.e. the bundled store does not have it).
 */
function resolveTemplateFiles(templateName: string): Record<string, string> | null {
  const bundled = bundledTemplates?.[templateName];
  if (bundled) return bundled;

  // Could be a bundled name that just isn't in the store yet, or a filesystem
  // path. Return null to signal "use filesystem".
  return null;
}

function loadFromBundledTemplates(templateName: string): boolean {
  const templateFiles = bundledTemplates?.[templateName];
  if (!templateFiles) {
    return false;
  }

  initTemplateEngineFromBundled(templateFiles);
  return true;
}

function loadFromFilesystem(templateName: string) {
  const templatesDir = resolveDir(templateName);
  initTemplateEngineFromDirectory(templatesDir);
}

/**
 * For composite [L2, L1] pairs where at least one side lives on the
 * filesystem: read both directories into memory, merge, and initialize a
 * bundled-style engine so the merge logic is uniform.
 */
function loadCompositeFromFilesystem(l2: string, l1: string) {
  const l1Files = getFilesFromSource(l1);
  const l2Files = getFilesFromSource(l2);
  const merged = mergeTemplateFiles(l1Files, l2Files);
  initTemplateEngineFromBundled(merged);
}

/**
 * Reads all `.ejs` files from a template source (bundled store or filesystem
 * directory) into a plain `Record<filename, content>` map.
 */
function getFilesFromSource(templateName: string): Record<string, string> {
  // Prefer bundled store
  const bundled = bundledTemplates?.[templateName];
  if (bundled) return bundled;

  const dir = resolveDir(templateName);
  return readEjsFilesFromDir(dir);
}

function resolveDir(templateName: string): string {
  const resolved = fs.existsSync(templateName)
    ? templateName
    : path.join(__dirname, '..', '..', 'templates', templateName);

  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Could not find directory with the template (we tried ${resolved}). Is the template name correct?`
    );
  }
  return resolved;
}

function readEjsFilesFromDir(dir: string): Record<string, string> {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ejs'));
  const result: Record<string, string> = {};
  for (const file of files) {
    result[file] = fs.readFileSync(path.join(dir, file), 'utf8');
  }
  return result;
}
