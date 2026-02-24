"""
backend/camera.py
OpenCV camera capture loop — runs in a daemon thread.

Responsibilities:
  - Open /dev/video0 (or CAMERA_DEVICE)
  - Read frames at FRAME_RATE fps
  - Annotate with timestamp
  - Send black frames when camera_enabled = False (privacy mode)
  - Push JPEG bytes to:
      • state.latest_frame  → /api/snapshot endpoint
      • streamer.feed()     → FFmpeg stdin pipe → RTSP
"""

import datetime
import threading
import time

import cv2
import numpy as np

import config
from models import state


def _make_black_frame() -> np.ndarray:
    """Privacy mode placeholder frame."""
    frame = np.zeros((config.FRAME_HEIGHT, config.FRAME_WIDTH, 3), dtype=np.uint8)
    cv2.putText(
        frame, "Camera Disabled",
        (config.FRAME_WIDTH // 2 - 160, config.FRAME_HEIGHT // 2),
        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (60, 60, 60), 2,
    )
    return frame


def _annotate(frame: np.ndarray) -> np.ndarray:
    """Burn timestamp into the frame (same style as the original Flask app)."""
    ts = datetime.datetime.now().strftime("%A %d %B %Y %I:%M:%S%p")
    cv2.putText(
        frame, ts,
        (10, frame.shape[0] - 10),
        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1,
    )
    return frame


def capture_loop(feed_callback=None):
    """
    Main capture loop — call this in a daemon thread from main.py.

    Args:
        feed_callback: optional callable(jpeg_bytes) — used by streamer to
                       pipe frames into FFmpeg stdin. Pass None in DEV_MODE.
    """
    state.cap = cv2.VideoCapture(config.CAMERA_DEVICE)
    state.cap.set(cv2.CAP_PROP_FRAME_WIDTH,  config.FRAME_WIDTH)
    state.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.FRAME_HEIGHT)
    state.cap.set(cv2.CAP_PROP_FPS,          config.FRAME_RATE)
    time.sleep(1.0)  # let the sensor settle

    interval = 1.0 / config.FRAME_RATE

    while True:
        t0 = time.monotonic()

        if state.camera_enabled:
            ret, frame = state.cap.read()
            if not ret:
                time.sleep(0.05)
                continue
            frame = _annotate(frame)
        else:
            frame = _make_black_frame()

        # Encode to JPEG
        ok, jpeg = cv2.imencode(
            ".jpg", frame,
            [cv2.IMWRITE_JPEG_QUALITY, 80],
        )
        if not ok:
            continue

        jpeg_bytes = jpeg.tobytes()

        # 1. Update snapshot cache
        state.set_frame(jpeg_bytes)

        # 2. Feed FFmpeg pipe (prod mode only)
        if feed_callback is not None:
            feed_callback(jpeg_bytes)

        elapsed = time.monotonic() - t0
        time.sleep(max(0.0, interval - elapsed))


def start(feed_callback=None) -> threading.Thread:
    """Spawn and return the capture daemon thread."""
    t = threading.Thread(
        target=capture_loop,
        args=(feed_callback,),
        daemon=True,
        name="camera-capture",
    )
    t.start()
    return t


def release():
    """Stop the OpenCV capture device (called on shutdown)."""
    if state.cap:
        state.cap.release()
        state.cap = None
