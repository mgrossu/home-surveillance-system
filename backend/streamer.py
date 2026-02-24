"""
backend/streamer.py
FFmpeg-based H.264 RTSP publisher → MediaMTX.

Flow:
  camera.py  →  feed(jpeg_bytes)  →  FFmpeg stdin pipe
                                       ↓
                                    H.264 encode
                                       ↓
                                    RTSP publish → MediaMTX → HA / HomeKit

Hardware encoder detection (no rebuild needed):
  RPi4  → /dev/video10 exists → h264_v4l2m2m  (zero CPU cost)
  x86   → libx264 ultrafast                   (dev laptop fallback)
"""

import subprocess
from pathlib import Path
from typing import Optional

import config
from models import state


# ── Encoder selection ─────────────────────────────────────────────────────────

def _encoder_args() -> list[str]:
    if Path("/dev/video10").exists():
        # RPi4 V4L2 M2M hardware encoder
        return ["-c:v", "h264_v4l2m2m", "-b:v", "2M"]
    # x86 software fallback
    return ["-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency", "-crf", "28"]


def _build_cmd() -> list[str]:
    return [
        "ffmpeg", "-loglevel", "warning",
        # Input: JPEG frames from stdin pipe
        "-f", "mjpeg",
        "-framerate", str(config.FRAME_RATE),
        "-i", "pipe:0",
        # Encode
        *_encoder_args(),
        "-pix_fmt", "yuv420p",
        "-g", str(config.FRAME_RATE),   # keyframe every second
        # Output: RTSP → MediaMTX
        "-f", "rtsp",
        "-rtsp_transport", "tcp",
        config.RTSP_URL,
    ]


# ── Lifecycle ─────────────────────────────────────────────────────────────────

def start():
    """Launch FFmpeg subprocess. Safe to call multiple times (idempotent)."""
    stop()  # kill any stale process first
    state.stream_proc = subprocess.Popen(
        _build_cmd(),
        stdin=subprocess.PIPE,
        stderr=open("/tmp/ffmpeg_stream.log", "w"),
    )


def stop():
    """Terminate the FFmpeg stream process."""
    if state.stream_proc and state.stream_proc.poll() is None:
        state.stream_proc.terminate()
        try:
            state.stream_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            state.stream_proc.kill()
    state.stream_proc = None


def is_alive() -> bool:
    return state.stream_proc is not None and state.stream_proc.poll() is None


def feed(jpeg_bytes: bytes):
    """
    Write one JPEG frame into the FFmpeg stdin pipe.
    Called by camera.capture_loop() on every frame.
    Auto-restarts FFmpeg if it crashed.
    """
    if not is_alive():
        start()
        return

    try:
        state.stream_proc.stdin.write(jpeg_bytes)
        state.stream_proc.stdin.flush()
    except (BrokenPipeError, OSError):
        start()  # restart on broken pipe
