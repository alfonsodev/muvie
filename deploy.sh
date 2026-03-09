#!/bin/bash
set -e

CONTAINER_NAME="muvie-web"
IMAGE_NAME="muvie-web"
ENV_FILE="$(dirname "$0")/apps/web/.env"
DB_PATH="$(dirname "$0")/apps/web/muvi.db"

echo "==> Pulling latest changes..."
git -C "$(dirname "$0")" pull origin main

echo "==> Building Docker image..."
sudo docker build -t "$IMAGE_NAME" "$(dirname "$0")"

echo "==> Stopping and removing existing container..."
sudo docker stop "$CONTAINER_NAME" 2>/dev/null || true
sudo docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo "==> Ensuring db is writable..."
touch "$DB_PATH"
chmod 666 "$DB_PATH"

echo "==> Starting new container..."
sudo docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 3001:3000 \
  --env-file "$ENV_FILE" \
  -v "$DB_PATH:/app/apps/web/muvi.db" \
  "$IMAGE_NAME"

echo "==> Waiting for container to be ready..."
sleep 3
sudo docker logs "$CONTAINER_NAME"
