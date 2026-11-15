"""Honesty gate: do the colourbar LUTs still invert correctly on the *transcoded* H.264
files at analysis resolution (160×90)? Prints a report used to label each mapping as
"data (tested)" / "data (approx.)" in docs/mappings.md.

This is a validation check only. The production feature math lives in src/analysis/ (TS).

    python scripts/validate_luts.py
"""
from __future__ import annotations

import colorsys
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / "public" / "media"
LUTS = ROOT / "public" / "luts"
W, H = 160, 90


def frames(video: Path, times: list[float], size=(W, H)) -> list[np.ndarray]:
    out = []
    for t in times:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", str(video), "-frames:v", "1",
                              "-vf", f"scale={size[0]}:{size[1]}:flags=area", "-f", "rawvideo",
                              "-pix_fmt", "rgb24", "-"], check=True, capture_output=True).stdout
        out.append(np.frombuffer(raw, np.uint8).reshape(size[1], size[0], 3).astype(float))
    return out


def hsv(a: np.ndarray) -> np.ndarray:
    f = a.reshape(-1, 3) / 255
    return np.array([colorsys.rgb_to_hsv(*p) for p in f]).reshape(a.shape)


def ocean_heat() -> None:
    lut = json.loads((LUTS / "ocean-heat.json").read_text(encoding="utf-8"))
    s = np.array(lut["samples"], float)
    bar_h = np.array([colorsys.rgb_to_hsv(*(p[:3] / 255))[0] for p in s])
    print("\n== Ocean Heat (hue LUT, 0–32 °C) at 160×80")
    for t in (5, 30, 60):
        f = frames(MEDIA / "ocean-heat.mp4", [t], (160, 80))[0]
        hv = hsv(f)
        colored = (hv[..., 1] > 0.35) & (hv[..., 2] > 0.12)
        dh = np.abs(hv[..., 0][..., None] - bar_h)
        dh = np.minimum(dh, 1 - dh)
        val, err = s[dh.argmin(-1), 3], dh.min(-1)
        ok = colored & (err < 0.03)
        bands = {"55–65°N": (0.14, 0.20), "10°S–10°N": (0.44, 0.56), "50–60°S": (0.78, 0.83)}
        txt = ", ".join(f"{k} {val[int(a * 80):int(b * 80)][ok[int(a * 80):int(b * 80)]].mean():.1f}°C"
                        for k, (a, b) in bands.items())
        print(f"  t={t:>2}s colored {colored.mean():.0%}, hue-matched {ok.sum() / max(colored.sum(), 1):.0%} | {txt}")


def forest_heights() -> None:
    lut = json.loads((LUTS / "forest-heights.json").read_text(encoding="utf-8"))
    s = np.array(lut["samples"], float)
    print("\n== Forest Heights (RGB LUT, 0–50 m) at 160×90, colourbar masked")
    for t in (10, 30, 45):
        f = frames(MEDIA / "forest-heights.mp4", [t])[0]
        f[int(0.86 * H):, :int(0.27 * W)] = 0
        p = f.reshape(-1, 3)
        veg = (p[:, 1] > p[:, 2] + 8) & (p.sum(1) > 60)
        d = np.linalg.norm(p[:, None, :] - s[None, :, :3], axis=2)
        dist, val = d.min(1), s[d.argmin(1), 3]
        m = veg & (dist < 40)
        print(f"  t={t:>2}s veg px {veg.mean():.0%}, within ΔRGB<40 {m.sum() / max(veg.sum(), 1):.0%}, "
              f"median ΔRGB {np.median(dist[veg]):.1f}, height p10/p50/p90 "
              f"{np.percentile(val[m], [10, 50, 90]).round(1).tolist() if m.any() else 'n/a'} m")


def four_winds() -> None:
    lut = json.loads((LUTS / "four-winds.json").read_text(encoding="utf-8"))
    cats = lut["categories"]
    print("\n== Four Winds (categorical) at 160×90: share of non-space px nearest to each legend swatch")
    for t in (5, 20, 40):
        f = frames(MEDIA / "four-winds.mp4", [t])[0].reshape(-1, 3)
        hv = hsv(f.reshape(H, W, 3)).reshape(-1, 3)
        h, s, v = hv[:, 0] * 360, hv[:, 1], hv[:, 2]
        globe = v > 0.08
        counts = {}
        for c in cats:
            if "hueHalfWidth" in c:
                dh = np.abs(h - c["hue"])
                dh = np.minimum(dh, 360 - dh)
                m = (dh <= c["hueHalfWidth"]) & (s >= c["minSat"]) & (v >= c["minVal"])
            else:
                m = (s <= c["maxSat"]) & (v >= c["minVal"])
            counts[c["id"]] = (m & globe).sum() / max(globe.sum(), 1)
        parts = ", ".join(f"{k} {x:.0%}" for k, x in counts.items())
        print(f"  t={t:>2}s globe {globe.mean():.0%} of frame | share of globe px: {parts}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1252 (no °, Δ)
    ocean_heat()
    forest_heights()
    four_winds()
