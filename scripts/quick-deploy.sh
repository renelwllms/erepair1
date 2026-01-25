#!/bin/bash

###############################################################################
# Quick Deploy Script for eRepair Shop
# Fast deployment without extensive logging
###############################################################################

set -e

APP_DIR="/home/epladmin/erepair"
APP_NAME="erepair-shop"
BRANCH="master"

cd "$APP_DIR"

echo "🚀 Quick deploying eRepair Shop..."

# Pull changes
echo "📥 Pulling latest changes..."
git pull origin "$BRANCH"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --silent

# Database
echo "🗄️  Updating database..."
npm run db:generate --silent
npm run db:push --silent

# Build
echo "🔨 Building application..."
npm run build

# Restart PM2
echo "🔄 Restarting application..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    pm2 reload "$APP_NAME"
else
    pm2 start ecosystem.config.js
    pm2 save
fi

echo "✅ Deployment complete!"
pm2 status "$APP_NAME"
