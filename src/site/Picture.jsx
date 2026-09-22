import IMAGES from '../images.json';

/**
 * Serves a bundled image as WebP at the size the layout actually needs, and
 * falls back to the original file for anything that cannot read WebP.
 *
 * Images uploaded through the dashboard live on another host and have no
 * generated sizes, so they are rendered as a plain <img>.
 */
export default function Picture({ src, alt, sizes, className, onClick, eager, ...rest }) {
  if (!src) return null;
  const meta = IMAGES[src];

  const common = {
    className,
    alt: alt || '',
    onClick,
    loading: eager ? 'eager' : 'lazy',
    decoding: eager ? 'sync' : 'async',
    fetchPriority: eager ? 'high' : undefined,
    ...(meta ? { width: meta.width, height: meta.height } : {}),
    ...rest,
  };

  if (!meta) return <img src={src} {...common} />;

  const stem = src.replace(/\.[^.]+$/, '');
  const srcSet = meta.widths.map((w) => `${stem}-${w}.webp ${w}w`).join(', ');

  return (
    <picture>
      <source type="image/webp" srcSet={srcSet} sizes={sizes || '100vw'} />
      <img src={src} {...common} />
    </picture>
  );
}

/** The widest generated file, used when an image is opened full size. */
export function largest(src) {
  const meta = IMAGES[src];
  if (!meta) return src;
  const stem = src.replace(/\.[^.]+$/, '');
  return `${stem}-${meta.widths[meta.widths.length - 1]}.webp`;
}
