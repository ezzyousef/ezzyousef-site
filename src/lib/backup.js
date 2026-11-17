import { migrate, validate } from './content-schema.js';

/** Reads an exported content file. Returns { content, error }; never throws. */
export function parseBackup(text) {
  let doc;
  try { doc = JSON.parse(text); } catch { return { content: null, error: 'That file is not valid JSON.' }; }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { content: null, error: 'That file is not a site content export.' };
  const content = migrate(doc);
  const problems = validate(content);
  if (problems.length) {
    const shown = problems.slice(0, 5).map((p) => `${p.path || 'content'}: ${p.message}`).join('; ');
    return { content: null, error: `That file has problems: ${shown}` };
  }
  return { content, error: null };
}

export const backupName = (d = new Date()) => `site-content-${d.toISOString().slice(0, 10)}.json`;
