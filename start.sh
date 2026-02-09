#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CRM Application Startup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed!${NC}"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed!${NC}"
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

# Determine docker compose command (v1 vs v2)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# ──────────────────────────────────────────────────────────
#  Dynamic port helper
#  find_available_port <base_port> <max_attempts>
#  Prints the first port starting at base_port that is not
#  in use on the host.
# ──────────────────────────────────────────────────────────
find_available_port() {
    local port=$1
    local max=${2:-10}
    local attempts=0
    while [ $attempts -lt $max ]; do
        # Check with ss (fast), fall back to lsof, fall back to /dev/tcp
        if command -v ss &> /dev/null; then
            if ! ss -ltn "sport = :$port" 2>/dev/null | grep -q ":$port"; then
                echo "$port"
                return 0
            fi
        elif command -v lsof &> /dev/null; then
            if ! lsof -i ":$port" &> /dev/null; then
                echo "$port"
                return 0
            fi
        else
            # Bash built-in /dev/tcp probe
            if ! (echo >/dev/tcp/127.0.0.1/$port) 2>/dev/null; then
                echo "$port"
                return 0
            fi
        fi
        echo -e "${YELLOW}  Port $port is busy, trying $((port + 1))...${NC}" >&2
        port=$((port + 1))
        attempts=$((attempts + 1))
    done
    echo "$port"  # last attempt even if occupied
    return 1
}

# ──────────────────────────────────────────────────────────
#  Try to start a specific service with a dynamic port.
#  If the container doesn't become healthy within TIMEOUT
#  seconds, tear it down, bump the port, and retry.
#
#  start_service_with_port_retry <svc> <base_port> <env_var>
# ──────────────────────────────────────────────────────────
start_service_with_port_retry() {
    local svc=$1
    local base_port=$2
    local env_var=$3
    local max_retries=${4:-5}
    local timeout=${5:-10}
    local port
    local attempt=0

    port=$(find_available_port "$base_port" "$max_retries")

    while [ $attempt -lt $max_retries ]; do
        export "$env_var=$port"
        echo -e "${CYAN}  → Attempting $svc on host port $port ...${NC}"

        # Remove stale container if present
        docker rm -f "crm-$svc" &>/dev/null || true

        $DOCKER_COMPOSE up -d "$svc" 2>/dev/null

        # Wait up to $timeout seconds for the container to be running
        local waited=0
        local ok=false
        while [ $waited -lt $timeout ]; do
            local state
            state=$(docker inspect --format='{{.State.Status}}' "crm-$svc" 2>/dev/null || echo "missing")
            local health
            health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "crm-$svc" 2>/dev/null || echo "unknown")

            if [ "$state" = "running" ] && { [ "$health" = "healthy" ] || [ "$health" = "none" ]; }; then
                # Extra: make sure the port is actually bound
                sleep 1
                state=$(docker inspect --format='{{.State.Status}}' "crm-$svc" 2>/dev/null || echo "missing")
                if [ "$state" = "running" ]; then
                    ok=true
                    break
                fi
            fi

            if [ "$state" = "exited" ] || [ "$state" = "dead" ] || [ "$state" = "missing" ]; then
                break
            fi

            sleep 1
            waited=$((waited + 1))
        done

        if $ok; then
            echo -e "${GREEN}  ✓ $svc is running on host port $port${NC}"
            return 0
        fi

        echo -e "${YELLOW}  ✗ $svc failed to start on port $port within ${timeout}s — retrying...${NC}"
        docker rm -f "crm-$svc" &>/dev/null || true
        port=$((port + 1))
        attempt=$((attempt + 1))
    done

    echo -e "${RED}  ✗ Could not start $svc after $max_retries port attempts (tried up to port $port)${NC}"
    return 1
}

# ──────────────────────────────────────────────────────────
#  1. Start MongoDB
# ──────────────────────────────────────────────────────────
echo -e "${YELLOW}Starting MongoDB...${NC}"
if docker ps --filter "name=crm-mongodb" --filter "status=running" | grep -q crm-mongodb; then
    MONGO_HOST_PORT=$(docker inspect --format='{{(index (index .NetworkSettings.Ports "27017/tcp") 0).HostPort}}' crm-mongodb 2>/dev/null || echo "27017")
    export MONGO_HOST_PORT
    echo -e "${GREEN}✓ MongoDB is already running on host port $MONGO_HOST_PORT${NC}"
else
    start_service_with_port_retry mongodb 27017 MONGO_HOST_PORT 5 15
    # Wait for MongoDB to be healthy (beyond just "running")
    echo -e "${YELLOW}Waiting for MongoDB to be ready...${NC}"
    MAX_WAIT=60
    WAITED=0
    while [ $WAITED -lt $MAX_WAIT ]; do
        if docker exec crm-mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
            echo -e "${GREEN}✓ MongoDB is healthy${NC}"
            break
        fi
        sleep 2
        WAITED=$((WAITED + 2))
        echo -ne "${YELLOW}.${NC}"
    done
    echo ""
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo -e "${RED}Error: MongoDB failed to become healthy within ${MAX_WAIT}s${NC}"
        exit 1
    fi
fi
echo ""

# ──────────────────────────────────────────────────────────
#  2. Start Redis (the most common conflict point)
# ──────────────────────────────────────────────────────────
echo -e "${YELLOW}Starting Redis...${NC}"
if docker ps --filter "name=crm-redis" --filter "status=running" | grep -q crm-redis; then
    REDIS_HOST_PORT=$(docker inspect --format='{{(index (index .NetworkSettings.Ports "6379/tcp") 0).HostPort}}' crm-redis 2>/dev/null || echo "6379")
    export REDIS_HOST_PORT
    echo -e "${GREEN}✓ Redis is already running on host port $REDIS_HOST_PORT${NC}"
else
    start_service_with_port_retry redis 6379 REDIS_HOST_PORT 5 10
fi
echo ""

# ──────────────────────────────────────────────────────────
#  3. Start API and Web (depend on the above)
# ──────────────────────────────────────────────────────────
echo -e "${YELLOW}Building and starting API & Web...${NC}"
$DOCKER_COMPOSE up -d --build api web 2>&1 | grep -v "^[[:space:]]*$" || true

echo ""
echo -e "${YELLOW}Waiting for API container to start...${NC}"

# First wait for container to be running
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    API_STATE=$(docker inspect --format='{{.State.Status}}' crm-api 2>/dev/null || echo "missing")
    if [ "$API_STATE" = "running" ]; then
        echo -e "${GREEN}✓ API container is running${NC}"
        break
    fi
    if [ "$API_STATE" = "exited" ] || [ "$API_STATE" = "dead" ]; then
        echo -e "${RED}✗ API container failed to start. Check logs:${NC}"
        docker logs --tail 50 crm-api
        exit 1
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    echo -ne "${YELLOW}.${NC}"
done
echo ""

if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${RED}Error: API container failed to start within ${MAX_WAIT}s${NC}"
    docker logs --tail 50 crm-api
    exit 1
fi

echo -e "${YELLOW}Waiting for API to be healthy...${NC}"

MAX_WAIT=90
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if docker exec crm-api wget --quiet --tries=1 --spider http://localhost:3000/ 2>/dev/null; then
        echo -e "${GREEN}✓ API is ready and healthy${NC}"
        break
    fi
    # Check if container is still running
    API_STATE=$(docker inspect --format='{{.State.Status}}' crm-api 2>/dev/null || echo "missing")
    if [ "$API_STATE" != "running" ]; then
        echo -e "${RED}✗ API container stopped unexpectedly. Logs:${NC}"
        docker logs --tail 50 crm-api
        exit 1
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    echo -ne "${YELLOW}.${NC}"
done
echo ""

if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${RED}Error: API failed to become healthy within ${MAX_WAIT}s${NC}"
    echo -e "${YELLOW}Last 50 lines of API logs:${NC}"
    docker logs --tail 50 crm-api
    exit 1
fi

# Wait for web container
echo -e "${YELLOW}Waiting for Web container...${NC}"
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    WEB_STATE=$(docker inspect --format='{{.State.Status}}' crm-web 2>/dev/null || echo "missing")
    if [ "$WEB_STATE" = "running" ]; then
        echo -e "${GREEN}✓ Web container is running${NC}"
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${YELLOW}Warning: Web container may not be ready${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  🚀 Application is running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  ${GREEN}Frontend:${NC}  http://localhost:5173"
echo -e "  ${GREEN}Backend API:${NC} http://localhost:3000"
echo -e "  ${GREEN}MongoDB:${NC}   mongodb://localhost:${MONGO_HOST_PORT:-27017}"
echo -e "  ${GREEN}Redis:${NC}     localhost:${REDIS_HOST_PORT:-6379}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  View logs:        ${YELLOW}docker logs -f crm-web${NC}"
echo -e "  View API logs:    ${YELLOW}docker logs -f crm-api${NC}"
echo -e "  View DB logs:     ${YELLOW}docker logs -f crm-mongodb${NC}"
echo -e "  View Redis logs:  ${YELLOW}docker logs -f crm-redis${NC}"
echo -e "  Stop services:    ${YELLOW}${DOCKER_COMPOSE} down${NC}"
echo -e "  Restart services: ${YELLOW}${DOCKER_COMPOSE} restart${NC}"
echo -e "  Remove volumes:   ${YELLOW}${DOCKER_COMPOSE} down -v${NC}"
echo ""
echo -e "${GREEN}Open your browser at: http://localhost:5173${NC}"
echo ""
