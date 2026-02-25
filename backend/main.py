"""
backend/main.py
FastAPI application — thin API layer that wires together:
  camera.py   → frame capture
  streamer.py → RTSP publish
  recorder.py → MP4 recording
  models.py   → shared state + schemas
  config.py   → settings
"""

import threading

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

import camera
import config
import recorder
import streamer
from models import (
    CameraResponse,
    RecordingFile,
    RecordingStartResponse,
    RecordingStopResponse,
    StatusResponse,
    state,
)

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="home-surveillance-system", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Lifecycle ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    config.RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

    if config.DEV_MODE:
        # Dev: snapshot works, no FFmpeg/MediaMTX needed
        camera.start(feed_callback=None)
    else:
        # Prod: start RTSP stream, then feed frames into it
        streamer.start()
        camera.start(feed_callback=streamer.feed)


@app.on_event("shutdown")
async def shutdown():
    streamer.stop()
    recorder.stop()
    camera.release()


# ── Status ────────────────────────────────────────────────────────────────────

@app.get("/api/status", response_model=StatusResponse)
def get_status():
    return StatusResponse(
        camera_enabled=state.camera_enabled,
        recording=state.recording,
        dev_mode=config.DEV_MODE,
        rtsp_url=config.get_rtsp_url_public() if not config.DEV_MODE else None,
        stream_alive=streamer.is_alive() if not config.DEV_MODE else None,
    )


# ── Camera control ────────────────────────────────────────────────────────────

@app.post("/api/camera/enable", response_model=CameraResponse)
def camera_enable():
    state.camera_enabled = True
    return CameraResponse(camera_enabled=True)


@app.post("/api/camera/disable", response_model=CameraResponse)
def camera_disable():
    state.camera_enabled = False
    return CameraResponse(camera_enabled=False)


# ── Recording ─────────────────────────────────────────────────────────────────

@app.post("/api/recording/start", response_model=RecordingStartResponse)
def recording_start():
    if state.recording:
        raise HTTPException(status_code=409, detail="Already recording")
    if config.DEV_MODE:
        raise HTTPException(
            status_code=503,
            detail="Recording not available in dev mode — no RTSP stream",
        )
    out = recorder.start()
    return RecordingStartResponse(recording=True, file=out)


@app.post("/api/recording/stop", response_model=RecordingStopResponse)
def recording_stop():
    if not state.recording:
        raise HTTPException(status_code=409, detail="Not recording")
    recorder.stop()
    return RecordingStopResponse(recording=False)


# ── Snapshot ──────────────────────────────────────────────────────────────────

@app.get("/api/snapshot")
def snapshot():
    """Latest frame as JPEG — frontend polls this at ~10fps for preview."""
    frame = state.get_frame()
    if frame is None:
        raise HTTPException(status_code=503, detail="No frame available yet")
    return Response(content=frame, media_type="image/jpeg")


# ── Recordings list ───────────────────────────────────────────────────────────

@app.get("/api/recordings", response_model=list[RecordingFile])
def list_recordings():
    return recorder.list_recordings()


# ── Serve built frontend (production) ─────────────────────────────────────────

if config.UI_DIST.exists():
    app.mount("/", StaticFiles(directory=str(config.UI_DIST), html=True), name="frontend")
