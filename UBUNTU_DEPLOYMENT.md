# eRepair Shop - Ubuntu Deployment Guide

This guide will help you deploy the eRepair Shop application on Ubuntu 20.04/22.04 LTS.

## Prerequisites

- Ubuntu 20.04 or 22.04 LTS server
- Root or sudo access
- Domain name (optional, but recommended for production)

## Step 1: Update System

```bash
sudo apt update
sudo apt upgrade -y
```

## Step 2: Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check PostgreSQL status
sudo systemctl status postgresql
```

### Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL prompt, create database and user
CREATE DATABASE erepairdb;
CREATE USER erepairuser WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE erepairdb TO erepairuser;
\q
```

### Configure PostgreSQL for remote connections (if needed)

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Find and change:
listen_addresses = '*'

# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add this line for local network access:
host    all             all             0.0.0.0/0            md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Step 3: Install Node.js

```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 4: Install Git

```bash
sudo apt install git -y
```

## Step 5: Clone and Setup Application

```bash
# Create application directory
sudo mkdir -p /var/www/erepair
sudo chown -R $USER:$USER /var/www/erepair

# Clone the repository
cd /var/www/erepair
git clone <your-repository-url> .

# Or if you have the files, upload them to /var/www/erepair

# Install dependencies
npm install
```

## Step 6: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add the following content to `.env`:

```env
# Database Configuration
DATABASE_URL="postgresql://erepairuser:your_secure_password_here@localhost:5432/erepairdb?schema=public"

# NextAuth Configuration
NEXTAUTH_SECRET="generate-a-secure-random-string-min-32-chars"
NEXTAUTH_URL="http://your-domain.com"  # or http://your-server-ip:3000

# Email Configuration (optional - can be configured in app settings)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM_EMAIL=""
SMTP_FROM_NAME=""
```

**Important:** Generate a secure NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

## Step 7: Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) Seed database with initial data
npm run db:seed
```

## Step 8: Build the Application

```bash
# Build the Next.js application
npm run build
```

## Step 9: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application
pm2 start npm --name "erepair" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command output instructions

# Check application status
pm2 status
pm2 logs erepair
```

## Step 10: Configure Nginx (Recommended for Production)

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/erepair
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/erepair /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

## Step 11: Setup SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot will automatically configure Nginx for HTTPS

# Test automatic renewal
sudo certbot renew --dry-run
```

## Step 12: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 5432/tcp  # PostgreSQL (only if remote access needed)

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 13: First-Time Setup

1. Open your browser and navigate to `http://your-domain.com` or `http://your-server-ip:3000`
2. On first access, you'll see the setup wizard
3. Follow the wizard to:
   - Create admin account
   - Configure company information
   - Set up email settings (SMTP)
   - Test database connection

## Common PM2 Commands

```bash
# View logs
pm2 logs erepair

# Restart application
pm2 restart erepair

# Stop application
pm2 stop erepair

# Start application
pm2 start erepair

# Delete from PM2
pm2 delete erepair

# Monitor
pm2 monit
```

## Updating the Application

```bash
# Pull latest changes
cd /var/www/erepair
git pull

# Install dependencies
npm install

# Run migrations
npx prisma db push

# Rebuild
npm run build

# Restart PM2
pm2 restart erepair
```

## Backup Database

```bash
# Create backup directory
mkdir -p /var/backups/erepair

# Backup database
sudo -u postgres pg_dump erepairdb > /var/backups/erepair/erepairdb_$(date +%Y%m%d_%H%M%S).sql

# Create automated daily backups
sudo nano /etc/cron.daily/erepair-backup
```

Add this to the cron file:

```bash
#!/bin/bash
sudo -u postgres pg_dump erepairdb > /var/backups/erepair/erepairdb_$(date +%Y%m%d).sql
find /var/backups/erepair -name "*.sql" -mtime +7 -delete
```

```bash
# Make it executable
sudo chmod +x /etc/cron.daily/erepair-backup
```

## Restore Database

```bash
sudo -u postgres psql erepairdb < /var/backups/erepair/erepairdb_YYYYMMDD.sql
```

## Troubleshooting

### Application won't start
```bash
# Check PM2 logs
pm2 logs erepair

# Check if port 3000 is available
sudo lsof -i :3000

# Check database connection
psql -U erepairuser -d erepairdb -h localhost
```

### Database connection errors
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Nginx errors
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx configuration
sudo nginx -t
```

## Security Recommendations

1. **Change default passwords** for database and admin accounts
2. **Enable firewall** (UFW)
3. **Use HTTPS** with Let's Encrypt
4. **Regular backups** - automate database backups
5. **Keep system updated** - `sudo apt update && sudo apt upgrade`
6. **Use strong NEXTAUTH_SECRET**
7. **Restrict database access** - only allow localhost unless needed
8. **Monitor logs** regularly
9. **Set up fail2ban** to prevent brute force attacks

## Support

For issues or questions:
- Check logs: `pm2 logs erepair`
- Check system logs: `sudo journalctl -u nginx -f`
- Database logs: `/var/log/postgresql/`

## Production Checklist

- [ ] PostgreSQL installed and secured
- [ ] Database created with secure password
- [ ] Node.js installed (v18+)
- [ ] Application cloned and dependencies installed
- [ ] .env file configured with secure values
- [ ] Database migrations run successfully
- [ ] Application built successfully
- [ ] PM2 configured and running
- [ ] PM2 startup script configured
- [ ] Nginx installed and configured
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Firewall configured
- [ ] Automated backups configured
- [ ] First-time setup completed through web interface
- [ ] Admin account created
- [ ] Email settings configured and tested
