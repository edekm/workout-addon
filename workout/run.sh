#!/usr/bin/with-contenv bashio
set -e

USER1_NAME=$(bashio::config 'user1_name')
USER2_NAME=$(bashio::config 'user2_name')
LOG_LEVEL=$(bashio::config 'log_level')

export USER1_NAME
export USER2_NAME
export LOG_LEVEL
export DATA_DIR=/data
export PORT=3000

bashio::log.info "Starting Workout add-on (users: ${USER1_NAME}, ${USER2_NAME})"

cd /app
exec node build/index.js
