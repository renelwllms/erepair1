#!/bin/bash

#############################################
# E-Repair - Fix Directory Permissions
#############################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Configuration
APP_USER="epladmin"
INSTALL_DIR="/home/epladmin/erepair3"

print_info "Fixing permissions for $INSTALL_DIR..."

# Check if directory exists
if [ ! -d "$INSTALL_DIR" ]; then
    print_error "Directory $INSTALL_DIR does not exist"
    exit 1
fi

# Fix ownership
print_info "Changing ownership to $APP_USER:$APP_USER..."
chown -R $APP_USER:$APP_USER "$INSTALL_DIR"

# Fix permissions
print_info "Setting proper permissions..."
chmod -R 755 "$INSTALL_DIR"

# Fix git directory permissions specifically
if [ -d "$INSTALL_DIR/.git" ]; then
    print_info "Fixing git directory permissions..."
    chmod -R 755 "$INSTALL_DIR/.git"
fi

print_success "Permissions fixed!"
print_info "You can now run the deployment script again"
