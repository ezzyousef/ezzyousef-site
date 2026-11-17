/** Small, testable decisions the dashboard makes around saving. */

/** After a submit, edits made since the snapshot keep the document unsaved. */
export const stillDirty = (submittedRevision, currentRevision) => submittedRevision !== currentRevision;

/** What to tell the owner after a publish, from the API's structured rebuild status. */
export function publishMessage(rebuild) {
  const s = rebuild && rebuild.status;
  if (s === 'requested') return { kind: 'ok', msg: 'Published. A site rebuild requested; the live content is already updated.' };
  if (s === 'pending') {
    return { kind: 'ok', msg: 'Published and saved. A site rebuild is pending; it will be requested shortly.', retryMs: Math.max(5, Number(rebuild.retryAfter) || 180) * 1000 };
  }
  if (s === 'failed') return { kind: 'bad', msg: `Published and saved, but the site rebuild failed (${(rebuild.message || 'no detail')}). The static pages may be out of date until the next rebuild.` };
  return { kind: 'ok', msg: 'Published and saved. No site rebuild was needed or configured.' };
}

/** A loaded draft or old version carries its own revision; the live one is what counts. */
export function withLiveRevision(next, live) {
  const out = { ...next };
  if (live && live.revision !== undefined) out.revision = live.revision;
  else delete out.revision;
  return out;
}
