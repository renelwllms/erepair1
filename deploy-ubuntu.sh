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
GIT_REPO="https://github.com/YOUR_USERNAME/erepair.git"  # UPDATE THIS
INSTALL_DIR="/opt/erepair"
APP_USER="erepair"
DOMAIN="erepair.yourdomain.com"  # UPDATE THIS
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
# Step 5: Install Nginx
#############################################
print_info "Step 5: Installing Nginx..."
if command_exists nginx; then
    print_warning "Nginx already installed"
else
    apt-get install -y nginx
    systemctl enable nginx
    print_success "Nginx installed"
fi
echo ""

#############################################
# Step 6: Install Certbot
#############################################
print_info "Step 6: Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx
print_success "Certbot installed"
echo ""

#############################################
# Step 7: Create Application User
#############################################
print_info "Step 7: Creating application user..."
if id "$APP_USER" &>/dev/null; then
    print_warning "User $APP_USER already exists"
else
    useradd -r -m -s /bin/bash -d /home/$APP_USER $APP_USER
    print_success "User $APP_USER created"
fi
echo ""

#############################################
# Step 8: Clone Repository
#############################################
print_info "Step 8: Cloning repository..."
if [ -d "$INSTALL_DIR" ]; then
    print_warning "Directory exists, pulling latest..."
    cd "$INSTALL_DIR"
    sudo -u $APP_USER git pull
else
    mkdir -p "$INSTALL_DIR"
    git clone "$GIT_REPO" "$INSTALL_DIR"
    chown -R $APP_USER:$APP_USER "$INSTALL_DIR"
    print_success "Repository cloned"
fi
cd "$INSTALL_DIR"
echo ""

#############################################
# Step 9: Setup Database
#############################################
print_info "Step 9: Setting up database..."
DB_PASSWORD=$(generate_password)

sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || print_warning "User may exist"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || print_warning "Database may exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

print_success "Database configured"
echo ""

#############################################
# Step 10: Create .env File
#############################################
print_info "Step 10: Creating environment configuration..."
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
# Step 11: Install Dependencies
#############################################
print_info "Step 11: Installing dependencies..."
sudo -u $APP_USER npm install
print_success "Dependencies installed"
echo ""

#############################################
# Step 12: Run Database Migrations
#############################################
print_info "Step 12: Running database migrations..."
sudo -u $APP_USER npx prisma generate
sudo -u $APP_USER npx prisma db push
sudo -u $APP_USER npx prisma db seed
print_success "Database initialized"
echo ""

#############################################
# Step 13: Build Application
#############################################
print_info "Step 13: Building application..."
sudo -u $APP_USER npm run build
print_success "Application built"
echo ""

#############################################
# Step 14: Configure PM2
#############################################
print_info "Step 14: Configuring PM2..."
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
echo ""

#############################################
# Step 15: Configure Nginx
#############################################
print_info "Step 15: Configuring Nginx..."
cat > /etc/nginx/sites-available/erepair << EOF
# HTTP - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL certificates (managed by Certbot)
    # ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/erepair.access.log;
    error_log /var/log/nginx/erepair.error.log;

    # Client settings
    client_max_body_size 50M;

    # Proxy to Next.js
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
}
EOF

ln -sf /etc/nginx/sites-available/erepair /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
print_success "Nginx configured"
echo ""

#############################################
# Step 16: Configure Firewall
#############################################
print_info "Step 16: Configuring firewall..."
if command_exists ufw; then
    ufw --force enable
    ufw allow 'Nginx Full'
    ufw allow 'OpenSSH'
    print_success "Firewall configured"
else
    print_warning "UFW not installed"
fi
echo ""

#############################################
# Step 17: SSL Certificate
#############################################
print_info "Step 17: SSL Certificate Setup"
read -p "Do you want to set up SSL now? (y/n): " SETUP_SSL

if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
    certbot --nginx -d $DOMAIN || print_warning "SSL setup failed. Run manually: sudo certbot --nginx -d $DOMAIN"
fi
echo ""

#############################################
# Save Configuration
#############################################
cat > "$INSTALL_DIR/DEPLOYMENT_INFO.txt" << EOF
E-Repair Shop - Deployment Information
Generated: $(date)

Installation: $INSTALL_DIR
Domain: https://$DOMAIN
Port: $APP_PORT

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
- Status: sudo -u $APP_USER pm2 status
- Logs: sudo -u $APP_USER pm2 logs erepair
- Restart: sudo -u $APP_USER pm2 restart erepair
- Stop: sudo -u $APP_USER pm2 stop erepair

Update Application:
  cd $INSTALL_DIR
  sudo -u $APP_USER git pull
  sudo -u $APP_USER npm install
  sudo -u $APP_USER npx prisma generate
  sudo -u $APP_USER npx prisma db push
  sudo -u $APP_USER npm run build
  sudo -u $APP_USER pm2 restart erepair

Nginx:
- Config: /etc/nginx/sites-available/erepair
- Test: sudo nginx -t
- Reload: sudo systemctl reload nginx
- Logs: /var/log/nginx/erepair.*.log

SSL Certificate:
- Renew: sudo certbot renew
- Auto-renewal: Enabled via systemd timer
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
echo "Domain: https://$DOMAIN"
echo "Status: sudo -u $APP_USER pm2 status"
echo "Logs: sudo -u $APP_USER pm2 logs erepair"
echo ""
echo "Info saved to: $INSTALL_DIR/DEPLOYMENT_INFO.txt"
echo ""
echo "Default Login:"
echo "- Admin: admin@erepair.com / Admin123!"
echo "- Tech: tech@erepair.com / Tech123!"
echo ""
print_success "Deployment complete!"
echo "============================================"
