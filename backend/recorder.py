"""
backend/recorder.py
FFmpeg-based MP4 recorder — reads directly from the RTSP stream.

Key properties:
  - Uses `-c copy` (stream copy) → zero re-encoding, zero CPU overhead
  - Recording is completely independent of the live stream
  - Output: timestamped MP4 in RECORDINGS_DIR
  - movflags +faststart → MP4 is playable before fully written
"""

import datetime
import subprocess
from pathlib import Path
from typing import Optional

import config
from models import state


def _output_path() -> Path:
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    return config.RECORDINGS_DIR / f"recording_{ts}.mp4"


def _build_cmd(out: Path) -> list[str]:
    return [
        "ffmpeg", "-loglevel", "warning",
        "-rtsp_transport", "tcp",
        "-i", config.RTSP_URL,
        "-c", "copy",               # stream copy — no re-encoding
        "-movflags", "+faststart",  # web-friendly MP4 structure
        str(out),
    ]


# ── Lifecycle ─────────────────────────────────────────────────────────────────

def start() -> str:
    """
    Start recording. Returns the output file path.
    Raises RuntimeError if already recording.
    """
    if state.recording:
        raise RuntimeError("Already recording")

    config.RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
    out = _output_path()

    state.record_proc = subprocess.Popen(
        _build_cmd(out),
        stderr=open("/tmp/ffmpeg_record.log", "w"),
    )
    state.recording = True
    return str(out)


def stop():
    """Stop the active recording. Safe to call even if not recording."""
    if state.record_proc and state.record_proc.poll() is None:
        state.record_proc.terminate()
        try:
            state.record_proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            state.record_proc.kill()
    state.record_proc = None
    state.recording = False


def list_recordings() -> list[dict]:
    """Return metadata for all saved MP4 files, newest first."""
    if not config.RECORDINGS_DIR.exists():
        return []
    files = sorted(config.RECORDINGS_DIR.glob("*.mp4"), reverse=True)
    return [
        {
            "name": f.name,
            "size_mb": round(f.stat().st_size / 1_048_576, 2),
            "created": datetime.datetime.fromtimestamp(
                f.stat().st_mtime
            ).isoformat(),
        }
        for f in files
    ]
