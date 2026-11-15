"""Download the selected NASA SVS media and make web-friendly copies.

Reproducible: every input URL lives in scripts/media_sources.json, raw downloads are
cached in .cache/ (gitignored), and outputs + provenance go to public/media/.

    python scripts/fetch_media.py            # fetch + transcode everything missing
    python scripts/fetch_media.py --force    # re-transcode even if outputs exist

Requires: Python 3.10+, ffmpeg/ffprobe on PATH. Standard library only.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "scripts" / "media_sources.json"
CACHE = ROOT / ".cache" / "svs"
OUT = ROOT / "public" / "media"
UA = "earthsong-jukebox-media-fetch/1.0 (NASA Space Apps 2026 project)"


def http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def download(url: str, dest: Path) -> Path:
    """Stream to disk; skip if already cached with the server's Content-Length."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        size = int(r.headers.get("Content-Length") or 0)
        if dest.exists() and size and dest.stat().st_size == size:
            print(f"  cached  {dest.name} ({size / 1e6:.1f} MB)")
            return dest
        tmp = dest.with_suffix(dest.suffix + ".part")
        with open(tmp, "wb") as f:
            shutil.copyfileobj(r, f, length=1 << 20)
    tmp.replace(dest)
    print(f"  fetched {dest.name} ({dest.stat().st_size / 1e6:.1f} MB)")
    return dest


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def probe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,r_frame_rate,nb_frames:format=duration",
         "-of", "json", str(path)],
        check=True, capture_output=True, text=True).stdout
    j = json.loads(out)
    s = j["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return {"width": s["width"], "height": s["height"],
            "fps": round(int(num) / int(den), 3),
            "duration": round(float(j["format"]["duration"]), 3)}


def transcode(src: Path, dest: Path, t: dict) -> None:
    # H.264 + yuv420p plays everywhere (the HEVC/VP8 sources don't); a short GOP keeps
    # scrubbing responsive, and +faststart lets playback begin before the file finishes.
    vf = f"scale={t['width']}:{t['height']}:flags=lanczos,fps={t['fps']}"
    cmd = ["ffmpeg", "-v", "error", "-y"]
    if t.get("startSeconds"):
        cmd += ["-ss", str(t["startSeconds"])]  # input seek: frame-accurate when transcoding
    cmd += ["-i", str(src), "-vf", vf, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", str(t["crf"]),
            "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0",
            "-g", str(t["fps"] // 2), "-movflags", "+faststart", str(dest)]
    subprocess.run(cmd, check=True)


def poster(video: Path, dest: Path, at: float) -> None:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(at), "-i", str(video),
                    "-frames:v", "1", "-vf", "scale=480:-2", "-c:v", "libwebp",
                    "-quality", "70", str(dest)], check=True)


def svs_record(svs_id: int) -> dict:
    """People and datasets straight from the SVS API, so credits never drift from the page."""
    d = json.loads(http_get(f"https://svs.gsfc.nasa.gov/api/{svs_id}"))
    return {
        "title": d["title"],
        "releaseDate": d["release_date"][:10],
        "credits": [{"role": c["role"],
                     "people": [f"{p['name']}" + (f" ({p['employer']})" if p.get("employer") else "")
                                for p in c["people"]]} for c in d["credits"]],
        "datasets": [{k: ds.get(k) for k in ("name", "platform", "sensor", "credit") if ds.get(k)}
                     for ds in d["datasets"]],
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-transcode existing outputs")
    ap.add_argument("--only", help="comma-separated track ids")
    args = ap.parse_args()
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            sys.exit(f"{tool} not found on PATH")

    cfg = json.loads(SOURCES.read_text(encoding="utf-8"))
    only = set(args.only.split(",")) if args.only else None
    OUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"tracks": {}}

    for tr in cfg["tracks"]:
        if only and tr["id"] not in only:
            continue
        print(f"[{tr['id']}] SVS {tr['svsId']}")
        raw = download(tr["source"], CACHE / str(tr["svsId"]) / Path(tr["source"]).name)
        video = OUT / f"{tr['id']}.mp4"
        if args.force or not video.exists():
            print("  transcoding…")
            transcode(raw, video, tr["transcode"])
        poster_path = OUT / f"{tr['id']}.webp"
        if args.force or not poster_path.exists():
            poster(video, poster_path, tr["posterAt"])

        colorbars = []
        for url in tr["colorbars"]:
            cb = download(url, CACHE / str(tr["svsId"]) / Path(url).name)
            colorbars.append({"sourceUrl": url, "cachePath": str(cb.relative_to(ROOT)).replace("\\", "/")})

        manifest["tracks"][tr["id"]] = {
            "svsId": tr["svsId"],
            **({"linkedFrom": tr["linkedFrom"]} if tr.get("linkedFrom") else {}),
            "pageUrl": tr["pageUrl"],
            "sourceUrl": tr["source"],
            "sourceSha256": sha256(raw),
            "creditLine": tr["creditLine"],
            "dataDates": tr["dataDates"],
            **svs_record(tr["svsId"]),
            "video": {"file": f"media/{video.name}", "bytes": video.stat().st_size, **probe(video),
                      "transcode": tr["transcode"]},
            "poster": f"media/{poster_path.name}",
            "colorbars": colorbars,
        }
        v = manifest["tracks"][tr["id"]]["video"]
        print(f"  -> {video.name}: {v['width']}x{v['height']} {v['fps']}fps {v['duration']}s {v['bytes'] / 1e6:.1f} MB")

    manifest["generated"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    manifest["notice"] = ("All visualizations by NASA's Scientific Visualization Studio and partners as credited. "
                          "Used under NASA media guidelines; no NASA endorsement is implied.")
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {manifest_path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
