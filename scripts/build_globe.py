"""Build the idle globe's land mask from an SVS 3912 still (no new data sources).

SVS 3912 "Global Sea Surface Currents and Temperature" is a true 2:1 equirectangular map
(-180..180 lon, -90..90 lat). In it, land is drawn as flat gray (low saturation, mid brightness)
while the ocean is coloured flow lines or near-black. That gives a clean land/ocean mask.

    python scripts/build_globe.py   ->  public/media/globe-land.png (1024x512, white = land)

Requires numpy, Pillow (scripts/requirements.txt).
"""
from __future__ import annotations

import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
URL = "https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/flat_global_ecco2_2028x1024.25000.jpg"
CACHE = ROOT / ".cache" / "svs" / "3912" / "flat_global_ecco2_2028x1024.25000.jpg"
OUT = ROOT / "public" / "media" / "globe-land.png"


def main() -> None:
    if not CACHE.exists():
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(URL, headers={"User-Agent": "earthsong-jukebox-media-fetch/1.0"})
        CACHE.write_bytes(urllib.request.urlopen(req, timeout=120).read())
    a = np.asarray(Image.open(CACHE).convert("RGB").resize((2048, 1024), Image.LANCZOS)).astype(float) / 255
    mx, mn = a.max(2), a.min(2)
    sat = (mx - mn) / (mx + 1e-6)
    land = (sat < 0.12) & (mx > 0.18) & (mx < 0.6)
    img = Image.fromarray((land * 255).astype(np.uint8))
    # Close pinholes left by thin flow lines crossing coasts, then soften the edge slightly.
    img = img.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    img.resize((1024, 512), Image.LANCZOS).save(OUT, optimize=True)
    print(f"wrote {OUT.relative_to(ROOT)} (land fraction {land.mean():.2f})")


if __name__ == "__main__":
    main()
