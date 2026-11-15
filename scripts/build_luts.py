"""Turn SVS colourbar images into colour→value lookup tables (public/luts/*.json).

The browser bakes these into an RGB cube at load time (src/analysis/lut.ts), so the
sound follows the *data value* behind a colour, not raw hue. Run after fetch_media.py:

    python scripts/build_luts.py

Requires: numpy, Pillow (see scripts/requirements.txt).
"""
from __future__ import annotations

import colorsys
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "svs"
OUT = ROOT / "public" / "luts"
N_SAMPLES = 64


def strip_samples(img: Path, rows: tuple[int, int], cols: tuple[int, int]) -> np.ndarray:
    """Median over a band of rows rejects tick marks and anti-aliasing on the bar edges."""
    a = np.asarray(Image.open(img).convert("RGB")).astype(float)
    band = np.median(a[rows[0]:rows[1], cols[0]:cols[1] + 1], axis=0)
    idx = np.linspace(0, band.shape[0] - 1, N_SAMPLES).round().astype(int)
    return band[idx]


def write(name: str, payload: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{name}.json").write_text(json.dumps(payload, indent=1) + "\n", encoding="utf-8")
    print(f"wrote public/luts/{name}.json")


def continuous(name, img, rows, cols, vmin, vmax, unit, mode, source, notes, open_max=False):
    rgb = strip_samples(img, rows, cols)
    vals = np.linspace(vmin, vmax, N_SAMPLES)
    write(name, {
        "kind": "continuous", "mode": mode, "unit": unit, "min": vmin, "max": vmax,
        "openEndedMax": open_max, "source": source, "notes": notes,
        "samples": [[int(round(c)) for c in px] + [round(float(v), 3)] for px, v in zip(rgb, vals)],
    })


def main() -> None:
    # Ocean Heat (3912). Bar interior measured at x 16–289, rows 38–52 of the 310×95 PNG;
    # tick labels 0 and 32 sit at the bar ends. Hue mode: thin flow streaks get blended with the
    # dark ocean when downscaled, which shifts brightness but keeps hue (validated in Phase 0).
    continuous("ocean-heat", CACHE / "3912" / "sst_ecco2_cbar.png", (38, 53), (16, 289), 0, 32, "°C", "hue",
               "https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/sst_ecco2_cbar.png",
               "Linear 0–32 °C across the bar, as labelled on the colourbar.")

    # Forest Heights (4950). 3840×2160 RGBA overlay; full-height bar columns 191–1825, rows 1863–1966
    # (measured from the alpha channel). The tip arrow past 50 m means "50 m or taller".
    continuous("forest-heights", CACHE / "4950" / "GEDI_colorbar_0to50_01.tif", (1895, 1935), (194, 1822),
               0, 50, "m", "rgb",
               "https://svs.gsfc.nasa.gov/vis/a000000/a004900/a004950/GEDI_colorbar_0to50_01.tif",
               "Linear 0–50 m; 50 means ≥ 50 m. Globe shading darkens colours, so inferred heights are approximate.",
               open_max=True)

    # Four Winds (5572). Categorical legend from 5669's colourbar: swatch centres sampled at row 187.
    # fetch_media.py caches colourbars under the *track's* SVS id (5572), even though the file is hosted on 5669.
    a = np.asarray(Image.open(CACHE / "5572" / "Aerosols_cbar.png").convert("RGB")).astype(int)
    swatches = {"smoke": (212, 391), "dust": (507, 686), "seaSalt": (809, 988), "sulfate": (1102, 1282)}
    labels = {"smoke": "Black carbon / smoke from fires", "dust": "Dust",
              "seaSalt": "Sea salt", "sulfate": "Sulfate (pollution and volcanoes)"}
    # The rendered globe doesn't reproduce the swatch RGB exactly (plumes are blended over a dark
    # ocean), so each class is a hue sector centred on its swatch hue plus saturation/brightness gates.
    # Sea salt renders as pale, bright swirls, so it is gated on low saturation + high brightness
    # instead of hue. Gate widths were tuned against frames at t=5/20/40 s (validate_luts.py).
    gates = {
        "smoke":   {"hueHalfWidth": 30, "minSat": 0.35, "minVal": 0.25},
        "dust":    {"hueHalfWidth": 45, "minSat": 0.12, "minVal": 0.30},
        "seaSalt": {"maxSat": 0.30, "minVal": 0.45},
        "sulfate": {"hueHalfWidth": 40, "minSat": 0.40, "minVal": 0.22},
    }
    cats = []
    for key, (x0, x1) in swatches.items():
        px = np.median(a[175:200, x0 + 20:x1 - 20].reshape(-1, 3), axis=0)
        hue = colorsys.rgb_to_hsv(*(px / 255))[0] * 360
        cats.append({"id": key, "label": labels[key], "rgb": [int(v) for v in px],
                     "hue": round(hue, 1), **gates[key]})
    write("four-winds", {
        "kind": "categorical", "source": "https://svs.gsfc.nasa.gov/vis/a000000/a005600/a005669/Aerosols_cbar.png",
        "notes": "Legend labels red as 'Black Carbon'; page text calls red/orange 'smoke from fires'. "
                 "Classes are hue sectors around each legend swatch with saturation/brightness gates. "
                 "Colours blend where types overlap, so coverage is approximate and screen area is not mass.",
        "categories": cats,
    })


if __name__ == "__main__":
    main()
