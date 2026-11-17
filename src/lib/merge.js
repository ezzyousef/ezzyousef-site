import { migrate } from './content-schema.js';

/** Deep merge so a saved document that predates a new field still renders.
 *  Arrays are replaced whole: a list the owner shortened stays short. */
export function merge(base, override) {
  if (Array.isArray(override)) return override;
  if (override && typeof override === 'object' && !Array.isArray(base) && base && typeof base === 'object') {
    const out = { ...base };
    for (const k of Object.keys(override)) out[k] = merge(base[k], override[k]);
    return out;
  }
  return override === undefined ? base : override;
}

/** The content to render: saved content over the build's copy, both brought
 *  up to the current schema first. Migrating the saved document before the
 *  merge matters, because the merged result inherits the build copy's
 *  schemaVersion and would otherwise skip the saved lists' migration. */
export function loadContent(base, saved) {
  const b = migrate(base);
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return b;
  return merge(b, migrate(saved));
}
