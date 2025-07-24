#!/bin/bash

# Campus Management System Docker Compose Launcher
# This script runs docker-compose from the docker folder

cd "$(dirname "$0")/docker" || exit 1

# Pass all arguments to docker-compose
docker-compose "$@"