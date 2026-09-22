"""
Builds responsive WebP versions of every bundled image.

Screenshots are shown in a four-up row, roughly 230px wide on a desktop and
never wider than about 700px, yet they shipped at 1440px as PNG. Each image
now gets a 700px and a 1400px WebP, and the page picks whichever the screen
actually needs. The original stays as the fallback for anything that cannot
read WebP.
"""
from PIL import Image
import glob, os, json, io

SRC = 'public/assets'
WIDTHS = [700, 1400]
before = after = 0
manifest = {}

for path in sorted(glob.glob(os.path.join(SRC, '*'))):
    if os.path.isdir(path) or path.endswith('.webp'):
        continue
    stem, ext = os.path.splitext(os.path.basename(path))
    if ext.lower() not in ('.png', '.jpg', '.jpeg'):
        continue

    with Image.open(path) as im:
        im = im.convert('RGB')
        orig = os.path.getsize(path)
        before += orig
        made, widths_made = [], []
        for w in WIDTHS:
            if im.width < w and w != WIDTHS[0]:
                continue
            scale = min(w, im.width)
            out = im if scale == im.width else im.resize(
                (scale, round(im.height * scale / im.width)), Image.LANCZOS)
            dest = os.path.join(SRC, f'{stem}-{scale}.webp')
            out.save(dest, 'WEBP', quality=82, method=6)
            size = os.path.getsize(dest)
            after += size
            made.append(f'{scale}w {size // 1024}KB')
            widths_made.append(scale)
        manifest[f'/assets/{stem}{ext}'] = {
            'widths': widths_made,
            'height': im.height,
            'width': im.width,
        }
        print(f'{stem:<26} {orig // 1024:>4}KB  ->  ' + '  '.join(made))

print(f'\noriginals {before // 1024} KB  ->  webp {after // 1024} KB '
      f'({100 - after * 100 // max(before, 1)}% smaller)')

with io.open('src/images.json', 'w', encoding='utf-8') as fh:
    json.dump(manifest, fh, indent=2, sort_keys=True)
print(f'manifest: src/images.json with {len(manifest)} entries')
