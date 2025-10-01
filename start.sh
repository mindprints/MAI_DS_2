#!/bin/bash
set -e

echo "Starting MAI DS 2 deployment..."

# Ensure all directories exist
mkdir -p public
mkdir -p src/site/images/slide

# Run the build process
echo "Building application..."
npm run build

# Start the server
echo "Starting server..."
exec node admin/server.js
