#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if MongoDB container is running
echo -e "${YELLOW}Checking MongoDB status...${NC}"
if docker ps --filter "name=crm-mongodb" --filter "status=running" | grep -q crm-mongodb; then
    echo -e "${GREEN}✓ MongoDB is already running${NC}"
else
    echo -e "${YELLOW}Starting MongoDB...${NC}"
    $DOCKER_COMPOSE up -d mongodb
    
    # Wait for MongoDB to be healthy
    echo -e "${YELLOW}Waiting for MongoDB to be ready...${NC}"
    MAX_WAIT=60
    WAITED=0
    while [ $WAITED -lt $MAX_WAIT ]; do
        if docker exec crm-mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
            echo -e "${GREEN}✓ MongoDB is ready${NC}"
            break
        fi
        sleep 2
        WAITED=$((WAITED + 2))
        echo -ne "${YELLOW}."
    done
    echo ""
    
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo -e "${RED}Error: MongoDB failed to start within ${MAX_WAIT} seconds${NC}"
        exit 1
    fi
fi

echo ""

# Build and start all containers
echo -e "${YELLOW}Building and starting all services...${NC}"
$DOCKER_COMPOSE up -d --build

echo ""
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"

# Wait for API to be healthy
MAX_WAIT=90
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if docker exec crm-api wget --quiet --tries=1 --spider http://localhost:3000/ 2>/dev/null; then
        echo -e "${GREEN}✓ API is ready${NC}"
        break
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    echo -ne "${YELLOW}."
done
echo ""

if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${RED}Warning: API may not be fully ready${NC}"
    echo -e "${YELLOW}Check logs with: docker logs crm-api${NC}"
fi

# Wait a bit for frontend
sleep 3

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  🚀 Application is running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo -e "  ${GREEN}Frontend:${NC} http://localhost:5173"
echo -e "  ${GREEN}Backend API:${NC} http://localhost:3000"
echo -e "  ${GREEN}MongoDB:${NC} mongodb://localhost:27017"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  View logs:        ${YELLOW}docker logs -f crm-web${NC}"
echo -e "  View API logs:    ${YELLOW}docker logs -f crm-api${NC}"
echo -e "  View DB logs:     ${YELLOW}docker logs -f crm-mongodb${NC}"
echo -e "  Stop services:    ${YELLOW}${DOCKER_COMPOSE} down${NC}"
echo -e "  Restart services: ${YELLOW}${DOCKER_COMPOSE} restart${NC}"
echo -e "  Remove volumes:   ${YELLOW}${DOCKER_COMPOSE} down -v${NC}"
echo ""
echo -e "${GREEN}Open your browser at: http://localhost:5173${NC}"
echo ""
