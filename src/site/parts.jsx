import { useEffect, useState } from 'react';
import { safeHref, isExternal } from '../lib/safe-url.js';
import { reducedMotion } from './Gallery.jsx';

/**
 * A link to content-supplied URL. Unsafe targets render as plain text, and
 * external links open in a new tab with no opener and no referrer.
 */
export function A({ href, children, className, ...rest }) {
  const url = safeHref(href);
  if (!url) return <span className={className}>{children}</span>;
  const ext = isExternal(url);
  return (
    <a href={url} className={className} target={ext ? '_blank' : undefined}
       rel={ext ? 'noopener noreferrer' : undefined} {...rest}>
      {children}
    </a>
  );
}

/** Link text for a telephone number keeps its digits on one line. */
export const linkLabel = (l) => (/^tel:/i.test(String(l.url || '')) ? String(l.label || '').replace(/ /g, '\u00a0') : l.label);

/** Splits a sentence around a phrase and links that phrase. */
export function Linked({ text, phrase, url }) {
  if (!phrase || !url || !text || !text.includes(phrase)) return <>{text}</>;
  const [before, ...rest] = text.split(phrase);
  return (
    <>
      {before}
      <A href={url}>{phrase}</A>
      {rest.join(phrase)}
    </>
  );
}

/** The margin column that carries a section's number and label. The number
 *  links to its own section, the way a printed paper lets you cite one. The
 *  visible number starts the link's name, so speech input can say it. */
export function Rail({ n, label, href }) {
  const num = String(n).padStart(2, '0');
  return (
    <div className="rail">
      {href
        ? <a className="rail-num" href={href}>{num}<span className="sr">, link to {label}</span></a>
        : <span className="rail-num">{num}</span>}
      <span className="rail-lab" aria-hidden={href ? 'true' : undefined}>{label}</span>
    </div>
  );
}

/** Appears once the reader is past the opening screen. */
export function BackToTop() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const onScroll = () => setOn(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button type="button" className={'totop' + (on ? ' on' : '')} aria-hidden={!on}
            tabIndex={on ? 0 : -1}
            onClick={() => window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' })}>
      Top
    </button>
  );
}

export function Footer({ c }) {
  return (
    <footer>
      <div className="foot-in">
        <span>{c.footer.left}</span>
        <span>{c.footer.right}</span>
      </div>
    </footer>
  );
}
