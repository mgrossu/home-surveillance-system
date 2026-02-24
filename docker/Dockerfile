# docker/Dockerfile
# Single container: FastAPI backend + FFmpeg
# Works on both RPi4 (linux/arm64) and x86 dev (linux/amd64).
# Hardware H.264 (h264_v4l2m2m) is auto-detected at runtime — no rebuild needed.

FROM python:3.13-slim

# System deps: FFmpeg + OpenCV runtime libs
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps (cached layer — only re-runs if requirements.txt changes)
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Backend source
COPY backend/ ./backend/

# Frontend dist is copied in by the build script or mounted as a volume
# It will be served by FastAPI's StaticFiles if the directory exists
RUN mkdir -p /app/frontend/dist

# Recordings volume mount point
RUN mkdir -p /recordings

EXPOSE 8008

# Run from the backend directory so relative imports work
WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8008"]
