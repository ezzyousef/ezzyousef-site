/** URL-safe name: "FTIR & XRD Toolkit" -> "ftir-xrd-toolkit". */
export function slugify(s) {
  return String(s || '')
    .normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** A unique slug for every project, in order. Empty names get "project-N";
 *  repeated names get "-2", "-3". */
export function projectSlugs(projects) {
  const seen = new Map();
  return (projects || []).map((p, i) => {
    const base = slugify(p && p.name) || `project-${i + 1}`;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

export const projectPath = (slug) => `/software/${slug}/`;

/** The slug in a path like /software/aerolab-studio/ (or without the slash). */
export function slugFromPath(pathname) {
  const m = /^\/software\/([a-z0-9-]+)\/?(?:index\.html)?$/.exec(String(pathname || ''));
  return m ? m[1] : null;
}
