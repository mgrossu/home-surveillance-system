# docker/Dockerfile
# Multi-stage build:
#   Stage 1 (frontend) — builds the React/TypeScript UI
#   Stage 2 (backend)  — FastAPI + FFmpeg, copies built UI from stage 1

# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM docker.io/library/node:20-slim AS frontend

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Backend ──────────────────────────────────────────────────────────
FROM docker.io/library/python:3.13-slim AS backend

RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Add video group with same GID as host so /dev/video0 is accessible
RUN groupadd -g 483 video-host || true && \
    usermod -aG video-host root

WORKDIR /app

COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend /app/dist ./frontend/dist

RUN mkdir -p /recordings

EXPOSE 8008

WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8008"]
