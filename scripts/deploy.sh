#!/bin/bash

###############################################################################
# Deployment Script for eRepair Shop
# This script pulls the latest updates from Git and deploys the application
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/home/epladmin/erepair"
APP_NAME="erepair-shop"
BRANCH="master"
LOG_FILE="$APP_DIR/logs/deploy-$(date +%Y%m%d-%H%M%S).log"

# Ensure logs directory exists
mkdir -p "$APP_DIR/logs"

###############################################################################
# Functions
###############################################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1" | tee -a "$LOG_FILE"
}

###############################################################################
# Pre-deployment Checks
###############################################################################

log "Starting deployment process..."
log "Log file: $LOG_FILE"

# Check if running in correct directory
if [ "$PWD" != "$APP_DIR" ]; then
    log "Changing to application directory: $APP_DIR"
    cd "$APP_DIR"
fi

# Check if Git repository
if [ ! -d ".git" ]; then
    log_error "Not a Git repository!"
    exit 1
fi

###############################################################################
# Backup current state
###############################################################################

log "Creating backup of current state..."
BACKUP_DIR="$APP_DIR/backups/deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup .env file if it exists
if [ -f ".env" ]; then
    cp .env "$BACKUP_DIR/.env"
    log_success "Backed up .env file"
fi

# Backup database schema
if [ -f "prisma/schema.prisma" ]; then
    cp prisma/schema.prisma "$BACKUP_DIR/schema.prisma"
    log_success "Backed up database schema"
fi

###############################################################################
# Check for local changes
###############################################################################

log "Checking for local changes..."
if ! git diff-index --quiet HEAD --; then
    log_warning "You have uncommitted changes!"
    log "Stashing local changes..."
    git stash save "Auto-stash before deployment $(date +'%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE" 2>&1
    STASHED=true
    log_success "Local changes stashed"
else
    STASHED=false
    log_success "Working directory is clean"
fi

###############################################################################
# Pull latest changes
###############################################################################

log "Fetching latest changes from origin/$BRANCH..."
git fetch origin "$BRANCH" >> "$LOG_FILE" 2>&1

log "Pulling latest changes..."
if git pull origin "$BRANCH" >> "$LOG_FILE" 2>&1; then
    log_success "Successfully pulled latest changes"
else
    log_error "Failed to pull changes from Git"
    if [ "$STASHED" = true ]; then
        log "Restoring stashed changes..."
        git stash pop >> "$LOG_FILE" 2>&1
    fi
    exit 1
fi

###############################################################################
# Install dependencies
###############################################################################

log "Installing npm dependencies..."
if npm install >> "$LOG_FILE" 2>&1; then
    log_success "Dependencies installed successfully"
else
    log_error "Failed to install dependencies"
    exit 1
fi

###############################################################################
# Database migration
###############################################################################

log "Generating Prisma client..."
if npm run db:generate >> "$LOG_FILE" 2>&1; then
    log_success "Prisma client generated"
else
    log_warning "Failed to generate Prisma client"
fi

log "Pushing database schema changes..."
if npm run db:push >> "$LOG_FILE" 2>&1; then
    log_success "Database schema updated"
else
    log_warning "Database push had issues (might be already up to date)"
fi

###############################################################################
# Build application
###############################################################################

log "Building Next.js application..."
if npm run build >> "$LOG_FILE" 2>&1; then
    log_success "Application built successfully"
else
    log_error "Build failed! Check logs at: $LOG_FILE"
    exit 1
fi

###############################################################################
# Restart PM2 process
###############################################################################

log "Checking if PM2 process exists..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    log "Reloading PM2 process (zero-downtime)..."
    if pm2 reload "$APP_NAME" >> "$LOG_FILE" 2>&1; then
        log_success "PM2 process reloaded successfully"
    else
        log_warning "PM2 reload failed, trying restart..."
        pm2 restart "$APP_NAME" >> "$LOG_FILE" 2>&1
        log_success "PM2 process restarted"
    fi
else
    log "PM2 process not found. Starting new process..."
    if pm2 start ecosystem.config.js >> "$LOG_FILE" 2>&1; then
        log_success "PM2 process started successfully"
        log "Saving PM2 process list..."
        pm2 save >> "$LOG_FILE" 2>&1
    else
        log_error "Failed to start PM2 process"
        exit 1
    fi
fi

###############################################################################
# Post-deployment
###############################################################################

log "Checking application status..."
sleep 2
pm2 status "$APP_NAME"

log_success "Deployment completed successfully!"
log "Backup location: $BACKUP_DIR"
log "Full deployment log: $LOG_FILE"

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
    log_warning "Don't forget to restore your stashed changes with: git stash pop"
fi

echo ""
log_success "Application is now running!"
echo ""
