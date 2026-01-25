#!/bin/bash

###############################################################################
# Rollback Script for eRepair Shop
# Rollback to a previous commit
###############################################################################

set -e

APP_DIR="/home/epladmin/erepair"
APP_NAME="erepair-shop"

cd "$APP_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== eRepair Shop Rollback ===${NC}"
echo ""

# Check if commit hash is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide a commit hash to rollback to${NC}"
    echo ""
    echo "Usage: ./rollback.sh <commit-hash>"
    echo ""
    echo "Recent commits:"
    git log --oneline -10
    exit 1
fi

COMMIT_HASH="$1"

echo -e "${YELLOW}Rolling back to commit: $COMMIT_HASH${NC}"
echo ""

# Verify commit exists
if ! git cat-file -e "$COMMIT_HASH" 2>/dev/null; then
    echo -e "${RED}Error: Commit $COMMIT_HASH does not exist${NC}"
    exit 1
fi

# Show commit details
echo "Commit details:"
git log -1 "$COMMIT_HASH"
echo ""

# Confirm rollback
read -p "Are you sure you want to rollback to this commit? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
fi

echo ""
echo "Creating backup..."
BACKUP_DIR="$APP_DIR/backups/rollback-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -f ".env" ] && cp .env "$BACKUP_DIR/.env"

echo "Performing rollback..."
git reset --hard "$COMMIT_HASH"

echo "Installing dependencies..."
npm install

echo "Updating database..."
npm run db:generate
npm run db:push

echo "Building application..."
npm run build

echo "Restarting application..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    pm2 reload "$APP_NAME"
else
    pm2 start ecosystem.config.js
fi

echo ""
echo -e "${GREEN}✅ Rollback complete!${NC}"
echo -e "Backup created at: $BACKUP_DIR"
pm2 status "$APP_NAME"
