"""
backend/models.py
Shared application state (singleton) + Pydantic response schemas.
"""

import threading
import subprocess
from typing import Optional

import cv2
import numpy as np
from pydantic import BaseModel


# ── Singleton app state ───────────────────────────────────────────────────────

class AppState:
    """
    Single source of truth shared across camera, streamer, and recorder modules.
    All mutable fields are protected by _lock where needed.
    """
    def __init__(self):
        self.camera_enabled: bool = True
        self.recording: bool = False

        # Subprocess handles
        self.stream_proc:  Optional[subprocess.Popen] = None
        self.record_proc:  Optional[subprocess.Popen] = None

        # OpenCV capture handle
        self.cap: Optional[cv2.VideoCapture] = None

        # Latest encoded JPEG frame (for /api/snapshot)
        self.latest_frame: Optional[bytes] = None

        self._lock = threading.Lock()

    def set_frame(self, jpeg: bytes) -> None:
        with self._lock:
            self.latest_frame = jpeg

    def get_frame(self) -> Optional[bytes]:
        with self._lock:
            return self.latest_frame


# Module-level singleton — imported by all other modules
state = AppState()


# ── API response schemas ──────────────────────────────────────────────────────

class StatusResponse(BaseModel):
    camera_enabled: bool
    recording: bool
    dev_mode: bool
    rtsp_url: Optional[str]
    stream_alive: Optional[bool]


class CameraResponse(BaseModel):
    camera_enabled: bool


class RecordingStartResponse(BaseModel):
    recording: bool
    file: str


class RecordingStopResponse(BaseModel):
    recording: bool


class RecordingFile(BaseModel):
    name: str
    size_mb: float
    created: str
