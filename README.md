# home-surveillance-system

Self-hosted home surveillance — Raspberry Pi 4, RTSP H.264, no cloud.

## Repo structure

```
home-surveillance-system/
├── backend/
│   ├── main.py          # FastAPI app (API + static UI serving)
│   ├── camera.py        # OpenCV capture loop
│   ├── streamer.py      # FFmpeg → RTSP publisher (MediaMTX)
│   ├── recorder.py      # RTSP → MP4 recording
│   ├── models.py        # Shared state + Pydantic schemas
│   ├── config.py        # All settings (env vars)
│   └── requirements.txt
├── frontend/            # React/TypeScript UI (from glance-at-home)
│   ├── src/
│   │   ├── api/backend.ts                        # API client
│   │   ├── hooks/useCamera.ts                    # Auto-detects dev/prod
│   │   ├── components/surveillance/
│   │   │   ├── CameraFeed.tsx                    # stream OR snapshot img
│   │   │   ├── ControlBar.tsx
│   │   │   └── DeviceSelector.tsx
│   │   └── pages/Index.tsx
│   └── vite.config.ts   # /api proxy → backend:8008
├── mediamtx/
│   └── mediamtx.yml     # RTSP server config
├── docker/
│   └── Dockerfile       # Backend container
├── recordings/          # MP4 files saved here
├── scripts/
│   ├── build-ui.sh      # Build frontend → frontend/dist/
│   ├── start-dev.sh     # Laptop dev: backend + frontend in one command
│   └── clean.sh
└── podman-compose.yml   # Production stack: mediamtx + backend
```

## Architecture

```
USB Camera (/dev/video0)
  └── camera.py (OpenCV)
        ├── streamer.py → FFmpeg → RTSP → MediaMTX ──→ Home Assistant
        │                                           └──→ HomeKit Bridge
        ├── recorder.py → FFmpeg (-c copy) → MP4 files
        └── /api/snapshot → <img> polling in frontend (10fps preview)
```

## Quick start

### Laptop (dev mode — no RPi needed)

```bash
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
# Opens http://localhost:8080 — browser will ask for webcam permission
```

### RPi4 (production)

```bash
# 1. Build the frontend
./scripts/build-ui.sh

# 2. Start the full stack
podman-compose up -d --build

# Logs
podman-compose logs -f backend
podman-compose logs -f mediamtx

# FFmpeg stream log (inside container)
podman exec hss-backend cat /tmp/ffmpeg_stream.log
```

### Dev on laptop → backend on RPi

```bash
cd frontend
VITE_API_URL=http://<rpi-ip>:8008 npm run dev
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | System status, RTSP health, recording state |
| POST | `/api/camera/enable` | Exit privacy mode (real frames) |
| POST | `/api/camera/disable` | Privacy mode (black frames, stream stays up) |
| POST | `/api/recording/start` | Start MP4 recording from RTSP |
| POST | `/api/recording/stop` | Stop recording |
| GET | `/api/snapshot` | Latest JPEG frame (frontend polls this) |
| GET | `/api/recordings` | List saved MP4 files |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CAMERA_DEVICE` | `0` | `/dev/videoN` index |
| `FRAME_WIDTH` | `1280` | Capture width |
| `FRAME_HEIGHT` | `720` | Capture height |
| `FRAME_RATE` | `25` | Capture FPS |
| `RTSP_URL` | `rtsp://mediamtx:8554/cam` | MediaMTX publish URL |
| `RECORDINGS_DIR` | `/recordings` | MP4 output path |
| `DEV_MODE` | `false` | Skip FFmpeg/RTSP; snapshot still works |
| `UI_DIST` | `/app/frontend/dist` | Built frontend path |

## Home Assistant

Add **Generic Camera** integration:
```
rtsp://<rpi-ip>:8554/cam
```
For **HomeKit**: enable the HomeKit Bridge integration in HA and expose the camera entity.

## Hardware encoder

Auto-detected at runtime — no rebuild needed:
- **RPi4** (`/dev/video10` exists) → `h264_v4l2m2m` (hardware, zero CPU)
- **x86 laptop** → `libx264 -preset ultrafast` (software fallback)
