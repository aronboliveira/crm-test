# Docker Setup Guide

## Quick Start

Run the application with a single command:

```bash
./start.sh
```

This script will:

1. Check if Docker and Docker Compose are installed
2. Start MongoDB if not already running
3. Build and start the backend API
4. Build and start the frontend web app
5. Display the URLs to access the application

## Manual Docker Commands

### Start all services

```bash
docker compose up -d --build
```

### Stop all services

```bash
docker compose down
```

### Stop and remove volumes (reset database)

```bash
docker compose down -v
```

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f web
docker compose logs -f api
docker compose logs -f mongodb
```

### Restart a service

```bash
docker compose restart web
docker compose restart api
```

## Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **MongoDB**: mongodb://localhost:27017

## Default Credentials

When `SEED_MOCKS=1` is enabled in the API, the following users are created:

- **Admin**: admin@corp.local / Admin#123
- **Manager**: manager@corp.local / Manager#123
- **Member**: member@corp.local / Member#123
- **Viewer**: viewer@corp.local / Viewer#123

## Troubleshooting

### Port conflicts

If ports 3000, 5173, or 27017 are already in use, you can change them in `docker-compose.yml`:

```yaml
ports:
  - "NEW_PORT:CONTAINER_PORT"
```

### Container won't start

Check logs:

```bash
docker compose logs api
```

### Reset everything

```bash
docker compose down -v
docker system prune -a
./start.sh
```

## Development Workflow

The Docker setup includes volume mounts for hot-reload:

- Changes to `apps/web` are automatically reflected
- Changes to `apps/api` trigger NestJS restart
- MongoDB data persists in named volumes

## Architecture

```
┌─────────────────┐
│   Frontend      │  Port 5173
│   (Vite/Vue)    │
└────────┬────────┘
         │
         │ HTTP
         ▼
┌─────────────────┐
│   Backend API   │  Port 3000
│   (NestJS)      │
└────────┬────────┘
         │
         │ MongoDB Protocol
         ▼
┌─────────────────┐
│   MongoDB       │  Port 27017
│   (Database)    │
└─────────────────┘
```
