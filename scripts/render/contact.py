"""Planche contact : python contact.py <dossier> <préfixe> <sortie.png> [colonnes]"""
import glob, os, re, sys
from PIL import Image, ImageDraw
d, prefix, out = sys.argv[1], sys.argv[2], sys.argv[3]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 10
files = sorted(glob.glob(os.path.join(d, prefix + '*.png')), key=lambda f: float(re.findall(r'-([\d_]+)s\.png$', f)[0].replace('_', '.')))
w, h = 270, 480
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + 6), rows * (h + 26)), (32, 32, 32))
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    x, y = (i % cols) * (w + 6), (i // cols) * (h + 26)
    sheet.paste(Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS), (x, y + 24))
    dr.text((x + 4, y + 5), re.findall(r'-([\d_]+)s\.png$', f)[0].replace('_', '.') + ' s', fill=(255, 190, 110))
sheet.save(out)
print(len(files), sheet.size)
