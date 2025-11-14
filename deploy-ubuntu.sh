#!/bin/bash

#############################################
# E-Repair Shop Management - Ubuntu Deployment
#############################################
# Automated deployment for Ubuntu servers
# Includes PostgreSQL, Node.js, Nginx, PM2, SSL

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }
generate_password() { openssl rand -base64 32 | tr -d "=+/" | cut -c1-25; }
generate_secret() { openssl rand -base64 32; }

# Configuration
GIT_REPO="https://github.com/renelwllms/erepair1.git"
INSTALL_DIR="/home/epladmin"
APP_USER="epladmin"
DOMAIN="erepair.yourdomain.com"  # UPDATE THIS if needed
APP_PORT="3000"
DB_NAME="erepair"
DB_USER="erepair_user"

clear
echo "============================================"
echo "  E-Repair Shop - Ubuntu Deployment        "
echo "============================================"
echo ""
print_info "This script will deploy the complete E-Repair system."
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

#############################################
# Step 1: Update System
#############################################
print_info "Step 1: Updating system..."
apt-get update
apt-get upgrade -y
print_success "System updated"
echo ""

#############################################
# Step 2: Install PostgreSQL
#############################################
print_info "Step 2: Installing PostgreSQL..."
if command_exists psql; then
    print_warning "PostgreSQL already installed"
else
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    print_success "PostgreSQL installed"
fi
echo ""

#############################################
# Step 3: Install Node.js 20
#############################################
print_info "Remove OLD libnode"
apt-get remove -y libnode-dev nodejs npm || true
print_info "Step 3: Installing Node.js 20..."
if command_exists node; then
    NODE_VERSION=$(node --version | cut -d'.' -f1 | tr -d 'v')
    if [ "$NODE_VERSION" -lt 20 ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    else
        print_warning "Node.js $(node --version) already installed"
    fi
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    print_success "Node.js installed"
fi
echo ""

#############################################
# Step 4: Install PM2
#############################################
print_info "Step 4: Installing PM2..."
if command_exists pm2; then
    print_warning "PM2 already installed"
else
    npm install -g pm2
    print_success "PM2 installed"
fi
echo ""

#############################################
# Step 5: Install Additional Tools
#############################################
print_info "Step 5: Installing additional tools..."
apt-get install -y git curl wget
print_success "Additional tools installed"
echo ""

#############################################
# Step 6: Verify Application User
#############################################
print_info "Step 6: Verifying application user..."
if id "$APP_USER" &>/dev/null; then
    print_success "User $APP_USER exists"
else
    print_error "User $APP_USER does not exist. Please create it first."
    exit 1
fi
echo ""

#############################################
# Step 7: Clone Repository
#############################################
print_info "Step 7: Cloning repository..."

# Check if .git directory exists to determine if this is a git repo
if [ -d "$INSTALL_DIR/.git" ]; then
    print_warning "Repository exists, pulling latest..."

    # Fix permissions before pulling
    chown -R $APP_USER:$APP_USER "$INSTALL_DIR"
    chmod -R 755 "$INSTALL_DIR"

    cd "$INSTALL_DIR"
    sudo -u $APP_USER git pull || {
        print_error "Git pull failed. Trying to reset..."
        sudo -u $APP_USER git fetch --all
        sudo -u $APP_USER git reset --hard origin/main || sudo -u $APP_USER git reset --hard origin/master
    }
    print_success "Repository updated"
else
    # Directory exists but is not a git repo - clone into it
    if [ "$(ls -A $INSTALL_DIR)" ]; then
        print_error "Directory $INSTALL_DIR is not empty and not a git repository"
        print_info "Please backup and remove contents or specify a different directory"
        exit 1
    fi

    cd "$INSTALL_DIR"
    sudo -u $APP_USER git clone "$GIT_REPO" .
    chown -R $APP_USER:$APP_USER "$INSTALL_DIR"
    chmod -R 755 "$INSTALL_DIR"
    print_success "Repository cloned"
fi
cd "$INSTALL_DIR"
echo ""

#############################################
# Step 8: Setup Database
#############################################
print_info "Step 8: Setting up database..."
DB_PASSWORD=$(generate_password)

sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || print_warning "User may exist"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || print_warning "Database may exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

print_success "Database configured"
echo ""

#############################################
# Step 9: Create .env File
#############################################
print_info "Step 9: Creating environment configuration..."
NEXTAUTH_SECRET=$(generate_secret)
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

cat > "$INSTALL_DIR/.env" << EOF
# Database
DATABASE_URL="$DATABASE_URL"

# NextAuth
NEXTAUTH_URL=https://$DOMAIN
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# Email (Optional - configure later)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@$DOMAIN"
EOF

chown $APP_USER:$APP_USER "$INSTALL_DIR/.env"
chmod 600 "$INSTALL_DIR/.env"
print_success "Environment configured"
echo ""

#############################################
# Step 10: Install Dependencies
#############################################
print_info "Step 10: Installing dependencies..."
sudo -u $APP_USER npm install
print_success "Dependencies installed"
echo ""

#############################################
# Step 11: Run Database Migrations
#############################################
print_info "Step 11: Running database migrations..."
sudo -u $APP_USER npx prisma generate
sudo -u $APP_USER npx prisma db push
sudo -u $APP_USER npx prisma db seed
print_success "Database initialized"
echo ""

#############################################
# Step 12: Build Application
#############################################
print_info "Step 12: Building application..."
sudo -u $APP_USER npm run build
print_success "Application built"
echo ""

#############################################
# Step 13: Configure PM2
#############################################
print_info "Step 13: Configuring PM2..."
cat > "$INSTALL_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'erepair',
    script: 'npm',
    args: 'start',
    cwd: '$INSTALL_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: $APP_PORT
    }
  }]
}
EOF

chown $APP_USER:$APP_USER "$INSTALL_DIR/ecosystem.config.js"

# Start PM2
sudo -u $APP_USER pm2 start ecosystem.config.js
sudo -u $APP_USER pm2 save
pm2 startup systemd -u $APP_USER --hp /home/$APP_USER
print_success "PM2 configured and started"
print_info "Application is running on http://localhost:$APP_PORT"
print_info "Configure your external reverse proxy to point to this port"
echo ""

#############################################
# Save Configuration
#############################################
cat > "$INSTALL_DIR/DEPLOYMENT_INFO.txt" << EOF
E-Repair Shop - Deployment Information
Generated: $(date)

Installation: $INSTALL_DIR
Application Port: $APP_PORT
Access: http://localhost:$APP_PORT

Database:
- Name: $DB_NAME
- User: $DB_USER
- Password: $DB_PASSWORD
- URL: $DATABASE_URL

NextAuth Secret: $NEXTAUTH_SECRET

Default Login:
- Admin: admin@erepair.com / Admin123!
- Tech: tech@erepair.com / Tech123!

PM2 Management:
- Status: pm2 status
- Logs: pm2 logs erepair
- Restart: pm2 restart erepair
- Stop: pm2 stop erepair
- Monitor: pm2 monit

Update Application:
  cd $INSTALL_DIR
  git pull
  npm install
  npx prisma generate
  npx prisma db push
  npm run build
  pm2 restart erepair

External Reverse Proxy Configuration:
- Point your reverse proxy to: http://localhost:$APP_PORT
- Ensure these headers are forwarded:
  * X-Real-IP
  * X-Forwarded-For
  * X-Forwarded-Proto
  * Host

Example Nginx config for external reverse proxy:
  location / {
    proxy_pass http://localhost:$APP_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
  }
EOF

chown $APP_USER:$APP_USER "$INSTALL_DIR/DEPLOYMENT_INFO.txt"

#############################################
# Final Summary
#############################################
clear
echo "============================================"
echo "       DEPLOYMENT COMPLETED! 🎉"
echo "============================================"
echo ""
print_success "E-Repair Shop successfully deployed!"
echo ""
echo "Application Port: $APP_PORT"
echo "Local Access: http://localhost:$APP_PORT"
echo ""
echo "PM2 Status: pm2 status"
echo "PM2 Logs: pm2 logs erepair"
echo "PM2 Monitor: pm2 monit"
echo ""
echo "Info saved to: $INSTALL_DIR/DEPLOYMENT_INFO.txt"
echo ""
echo "Default Login:"
echo "- Admin: admin@erepair.com / Admin123!"
echo "- Tech: tech@erepair.com / Tech123!"
echo ""
print_info "Next Steps:"
echo "1. Configure your external reverse proxy to point to port $APP_PORT"
echo "2. Set up SSL/HTTPS on your external reverse proxy"
echo "3. Update NEXTAUTH_URL in .env if using a custom domain"
echo ""
print_success "Deployment complete!"
echo "============================================"
