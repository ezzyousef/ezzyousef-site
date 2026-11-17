/**
 * Wording for the software showcase, shared by the page and the static
 * prerender so both say the same thing. Every label states only what the
 * content says: a project without downloads is described as having no
 * installer here, never as available.
 */
export const STATUS_LABELS = {
  released: 'Released',
  beta: 'Beta',
  'in development': 'In development',
  unpublished: 'Not yet published',
  archived: 'Archived',
};

export const statusLabel = (s) => STATUS_LABELS[s] || '';

/** Rows for the project's facts table, skipping anything left empty. */
export function infoRows(p) {
  const rows = [];
  if (statusLabel(p.status)) rows.push(['Status', statusLabel(p.status)]);
  if (p.version) rows.push(['Version', p.channel ? `${p.version} (${p.channel})` : p.version]);
  else if (p.channel) rows.push(['Channel', p.channel]);
  if ((p.platforms || []).filter(Boolean).length) rows.push(['Platforms', p.platforms.filter(Boolean).join(', ')]);
  if (p.license) rows.push(['Licence', p.license]);
  return rows;
}

export function downloadsOf(p) {
  return (p.downloads || []).filter((d) => d && d.url);
}

/** The sentence shown when nothing can be downloaded. */
export function noInstallerNote(p) {
  if (downloadsOf(p).length) return '';
  const hasSource = (p.links || []).some((l) => l && l.url);
  return hasSource
    ? 'No installer is offered here yet; the source code is linked below.'
    : 'No installer or source code is offered here yet.';
}
