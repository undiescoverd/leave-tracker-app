#!/bin/sh
# Health check script for Docker container

# Default values
HEALTH_CHECK_PORT=${PORT:-3000}
HEALTH_CHECK_HOST=${HOSTNAME:-0.0.0.0}
HEALTH_CHECK_PATH="/api/health"

# Use wget or curl to check health endpoint
if command -v wget >/dev/null 2>&1; then
    wget --no-verbose --tries=1 --spider --timeout=10 \
         --header="User-Agent: Docker-Healthcheck" \
         "http://${HEALTH_CHECK_HOST}:${HEALTH_CHECK_PORT}${HEALTH_CHECK_PATH}"
elif command -v curl >/dev/null 2>&1; then
    curl -f --silent --show-error --max-time 10 \
         --user-agent "Docker-Healthcheck" \
         "http://${HEALTH_CHECK_HOST}:${HEALTH_CHECK_PORT}${HEALTH_CHECK_PATH}"
else
    echo "Neither wget nor curl is available for health check"
    exit 1
fi