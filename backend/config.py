"""
backend/config.py
All runtime configuration in one place.
Values come from environment variables with sensible defaults.
"""

import os
from pathlib import Path


# ── Camera ────────────────────────────────────────────────────────────────────
CAMERA_DEVICE   = int(os.getenv("CAMERA_DEVICE", "0"))
FRAME_WIDTH     = int(os.getenv("FRAME_WIDTH",   "1280"))
FRAME_HEIGHT    = int(os.getenv("FRAME_HEIGHT",  "720"))
FRAME_RATE      = int(os.getenv("FRAME_RATE",    "25"))

# ── Streaming ─────────────────────────────────────────────────────────────────
RTSP_URL        = os.getenv("RTSP_URL", "rtsp://mediamtx:8554/cam")

# ── Recording ─────────────────────────────────────────────────────────────────
RECORDINGS_DIR  = Path(os.getenv("RECORDINGS_DIR", "./recordings"))

# ── App ───────────────────────────────────────────────────────────────────────
# DEV_MODE=true  → skip FFmpeg/MediaMTX; /api/snapshot still works via OpenCV
# DEV_MODE=false → full pipeline: OpenCV → FFmpeg → RTSP → MediaMTX
DEV_MODE        = os.getenv("DEV_MODE", "false").lower() == "true"

HOST            = os.getenv("HOST", "0.0.0.0")
PORT            = int(os.getenv("PORT", "8008"))

# ── UI ────────────────────────────────────────────────────────────────────────
# Path where the built Vite/React dist is mounted at runtime
UI_DIST         = Path(os.getenv("UI_DIST", "/app/frontend/dist"))

def get_host_ip() -> str:
    """Get the host machine's LAN IP address."""
    try:
        # Connect to a public IP to determine the outbound interface IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"


def get_rtsp_url_public() -> str:
    """Return the RTSP URL with the real host IP instead of container hostname."""
    ip = get_host_ip()
    # Replace the mediamtx hostname with the actual host IP
    return RTSP_URL.replace("mediamtx", ip)