# nginx reverse proxy for MeetHead

This folder contains a small nginx reverse-proxy that listens on host port 11003 and proxies to your frontend and backend running on the host.

Assumptions

- Frontend is available at http://localhost:11001
- Backend is available at http://localhost:11002

Files

- `docker-compose.yml` - runs an `nginx:stable-alpine` container and exposes port 11003
- `nginx.conf` - proxy rules: `/api/` and `/socket.io/` -> backend; everything else -> frontend

Run

1. From the repo root (where `nginx/` lives) run:

```bash
docker compose -f nginx/docker-compose.yml up -d
```

2. Open your browser at: http://localhost:11003

Notes

- The nginx config uses `host.docker.internal` so the nginx container can reach services running on the host (Windows Docker Desktop / WSL2). If you're running Docker in a different environment where `host.docker.internal` is not available, replace `host.docker.internal` with the host's IP accessible from the container.
- If your backend uses additional websocket paths, add websocket proxying blocks similar to the `location /socket.io/` section.
