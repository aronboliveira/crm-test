#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CRM Application Startup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not installed${NC}"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker-compose)
else
  echo -e "${RED}Error: Docker Compose is not installed${NC}"
  exit 1
fi

compose() {
  "${DOCKER_COMPOSE[@]}" "$@"
}

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-crm-test}"
BUILDKIT_PROGRESS="${BUILDKIT_PROGRESS:-plain}"
export COMPOSE_PROJECT_NAME BUILDKIT_PROGRESS

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

find_available_port() {
  local port="$1"
  local max_attempts="${2:-20}"
  local tries=0

  while [ "$tries" -lt "$max_attempts" ]; do
    if command -v ss >/dev/null 2>&1; then
      if ! ss -ltn "sport = :$port" 2>/dev/null | grep -q ":$port"; then
        echo "$port"
        return 0
      fi
    elif command -v lsof >/dev/null 2>&1; then
      if ! lsof -i ":$port" >/dev/null 2>&1; then
        echo "$port"
        return 0
      fi
    else
      if ! (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1; then
        echo "$port"
        return 0
      fi
    fi

    echo -e "${YELLOW}  Port $port is busy, trying $((port + 1))...${NC}" >&2
    port=$((port + 1))
    tries=$((tries + 1))
  done

  echo -e "${RED}Could not find a free port after ${max_attempts} attempts${NC}" >&2
  return 1
}

wait_for_service() {
  local service="$1"
  local timeout="${2:-120}"
  local waited=0

  while [ "$waited" -lt "$timeout" ]; do
    local cid
    cid="$(compose ps -q "$service" 2>/dev/null || true)"

    if [ -n "$cid" ]; then
      local state
      state="$(docker inspect --format='{{.State.Status}}' "$cid" 2>/dev/null || echo missing)"
      local health
      health="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || echo unknown)"

      if [ "$state" = "running" ] && { [ "$health" = "healthy" ] || [ "$health" = "none" ]; }; then
        return 0
      fi

      if [ "$state" = "exited" ] || [ "$state" = "dead" ]; then
        echo -e "${RED}✗ Service '$service' stopped unexpectedly${NC}"
        compose logs --tail 80 "$service" || true
        return 1
      fi
    fi

    sleep 2
    waited=$((waited + 2))
  done

  echo -e "${RED}✗ Timeout waiting for service '$service'${NC}"
  compose logs --tail 80 "$service" || true
  return 1
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local timeout="${3:-60}"
  local waited=0

  while [ "$waited" -lt "$timeout" ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
  done

  echo -e "${YELLOW}Warning: ${name} endpoint did not respond in ${timeout}s (${url})${NC}"
  return 1
}

echo -e "${YELLOW}Cleaning up stale resources...${NC}"
# Legacy fixed-name containers from older compose revisions
for legacy in crm-api crm-web crm-redis crm-mongodb; do
  docker rm -f "$legacy" >/dev/null 2>&1 || true
done
# Explicit cleanup for containers that may have been left without compose labels
for svc in api web redis mongodb; do
  docker rm -f "${COMPOSE_PROJECT_NAME}-${svc}-1" >/dev/null 2>&1 || true
  docker rm -f "${COMPOSE_PROJECT_NAME}_${svc}_1" >/dev/null 2>&1 || true
done
compose down --remove-orphans >/dev/null 2>&1 || true
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

MONGO_HOST_PORT="$(find_available_port 27017 20)"
REDIS_HOST_PORT="$(find_available_port 6379 20)"
API_HOST_PORT="$(find_available_port 3000 20)"
WEB_HOST_PORT="$(find_available_port 5173 20)"

export MONGO_HOST_PORT REDIS_HOST_PORT API_HOST_PORT WEB_HOST_PORT

cat > .runtime-ports.env <<PORTS
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME}
MONGO_HOST_PORT=${MONGO_HOST_PORT}
REDIS_HOST_PORT=${REDIS_HOST_PORT}
API_HOST_PORT=${API_HOST_PORT}
WEB_HOST_PORT=${WEB_HOST_PORT}
CYPRESS_API_URL=http://localhost:${API_HOST_PORT}
CYPRESS_BASE_URL=http://localhost:${WEB_HOST_PORT}
PORTS

echo -e "${YELLOW}Selected host ports:${NC}"
echo -e "  ${CYAN}MongoDB:${NC} ${MONGO_HOST_PORT}"
echo -e "  ${CYAN}Redis:${NC}   ${REDIS_HOST_PORT}"
echo -e "  ${CYAN}API:${NC}     ${API_HOST_PORT}"
echo -e "  ${CYAN}Web:${NC}     ${WEB_HOST_PORT}"
echo -e "${GREEN}✓ Runtime ports saved to .runtime-ports.env${NC}"
echo ""

echo -e "${YELLOW}Starting services...${NC}"
if [ "${FORCE_REBUILD:-0}" = "1" ]; then
  echo -e "${CYAN}  → FORCE_REBUILD=1, rebuilding images${NC}"
  if ! compose up -d --build; then
    echo -e "${RED}Error: Failed to start services via Docker Compose.${NC}"
    compose logs --tail 80 || true
    exit 1
  fi
else
  if ! compose up -d; then
    echo -e "${YELLOW}Initial startup failed, retrying once with image build...${NC}"
    if ! compose up -d --build; then
      echo -e "${RED}Error: Failed to start services via Docker Compose.${NC}"
      compose logs --tail 80 || true
      exit 1
    fi
  fi
fi

echo -e "${YELLOW}Waiting for MongoDB...${NC}"
wait_for_service mongodb 120
echo -e "${GREEN}✓ MongoDB is ready${NC}"

echo -e "${YELLOW}Waiting for Redis...${NC}"
wait_for_service redis 90
echo -e "${GREEN}✓ Redis is ready${NC}"

echo -e "${YELLOW}Waiting for API...${NC}"
wait_for_service api 150
wait_for_http "API" "http://localhost:${API_HOST_PORT}/auth/oauth/providers" 90 || true
echo -e "${GREEN}✓ API is ready${NC}"

echo -e "${YELLOW}Waiting for Web...${NC}"
wait_for_service web 120
wait_for_http "Web" "http://localhost:${WEB_HOST_PORT}" 120 || true
echo -e "${GREEN}✓ Web is ready${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Application is running${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  ${GREEN}Frontend:${NC}  http://localhost:${WEB_HOST_PORT}"
echo -e "  ${GREEN}Backend API:${NC} http://localhost:${API_HOST_PORT}"
echo -e "  ${GREEN}MongoDB:${NC}   mongodb://localhost:${MONGO_HOST_PORT}"
echo -e "  ${GREEN}Redis:${NC}     localhost:${REDIS_HOST_PORT}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  Logs (all):      ${YELLOW}compose logs -f${NC}"
echo -e "  API logs:        ${YELLOW}compose logs -f api${NC}"
echo -e "  Web logs:        ${YELLOW}compose logs -f web${NC}"
echo -e "  Stop:            ${YELLOW}compose down${NC}"
echo -e "  Reset volumes:   ${YELLOW}compose down -v${NC}"
echo ""
