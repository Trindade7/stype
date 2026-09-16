#!/bin/sh
set -e

# Ensure persistent data directory exists
mkdir -p /app/data

# If running as root, fix permissions of /app/data and step down to node user
if [ "$(id -u)" = '0' ]; then
    chown -R node:node /app/data
    exec gosu node "$@"
fi

exec "$@"
