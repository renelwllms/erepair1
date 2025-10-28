# E-Repair Shop - Deployment Guide

Complete deployment guide for E-Repair Shop Management System on Ubuntu and Windows servers.

## Table of Contents
- [Ubuntu Deployment](#ubuntu-deployment)
- [Windows Deployment](#windows-deployment)
- [Post-Deployment](#post-deployment)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Ubuntu Deployment

### Prerequisites
- Ubuntu 20.04 LTS or newer
- Root/sudo access
- Domain name pointing to server IP
- Ports 80 and 443 open

### Quick Start

1. **Download deployment script:**
```bash
wget https://raw.githubusercontent.com/YOUR_USERNAME/erepair/main/deploy-ubuntu.sh
chmod +x deploy-ubuntu.sh
```

2. **Edit configuration (IMPORTANT):**
```bash
nano deploy-ubuntu.sh
```
Update these variables:
- `GIT_REPO` - Your GitHub repository URL
- `DOMAIN` - Your domain name (e.g., erepair.yourdomain.com)

3. **Run deployment:**
```bash
sudo ./deploy-ubuntu.sh
```

### What Gets Installed
- PostgreSQL 16
- Node.js 20 LTS
- PM2 process manager
- Nginx web server
- Certbot for SSL
- Application deployed to `/opt/erepair`

### Post-Installation

**Check services:**
```bash
sudo -u erepair pm2 status
sudo systemctl status nginx
```

**View logs:**
```bash
sudo -u erepair pm2 logs erepair
tail -f /var/log/nginx/erepair.access.log
```

**Restart application:**
```bash
sudo -u erepair pm2 restart erepair
```

### SSL Certificate

The script will ask if you want to set up SSL. If you skip it, run manually:
```bash
sudo certbot --nginx -d your-domain.com
```

### Update Application

```bash
cd /opt/erepair
sudo -u erepair git pull
sudo -u erepair npm install
sudo -u erepair npx prisma generate
sudo -u erepair npx prisma db push
sudo -u erepair npm run build
sudo -u erepair pm2 restart erepair
```

---

## Windows Deployment

### Prerequisites
- Windows Server 2019+ or Windows 10/11 Pro
- Administrator PowerShell access
- Domain name pointing to server IP
- Ports 80 and 443 open in firewall

### Quick Start

1. **Download deployment script:**
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/YOUR_USERNAME/erepair/main/deploy-windows.ps1" -OutFile "$env:TEMP\deploy-windows.ps1"
```

2. **Edit configuration (IMPORTANT):**
```powershell
notepad "$env:TEMP\deploy-windows.ps1"
```
Update these variables:
- `$GIT_REPO` - Your GitHub repository URL
- `$DOMAIN` - Your domain name
- `$EMAIL` - Email for SSL certificate

3. **Run deployment:**
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
& "$env:TEMP\deploy-windows.ps1"
```

### What Gets Installed
- PostgreSQL 16
- Node.js 20 LTS
- Caddy web server (automatic SSL)
- NSSM service manager
- Chocolatey package manager
- Application deployed to `C:\apps\erepair`

### Post-Installation

**Check services:**
```powershell
Get-Service ERepair, ERepairCaddy | Format-Table -AutoSize
```

**View logs:**
```powershell
Get-Content C:\apps\erepair\logs\app.log -Tail 50 -Wait
Get-Content C:\apps\erepair\logs\caddy.log -Tail 50
```

**Restart application:**
```powershell
Restart-Service ERepair
```

### Update Application

```powershell
cd C:\apps\erepair
Stop-Service ERepair
git pull
npm install
npx prisma generate
npx prisma db push
npm run build
Start-Service ERepair
```

---

## Post-Deployment

### Default Login Credentials

After deployment, log in with:

| Role         | Email              | Password   |
|--------------|-------------------|-----------|
| Administrator| admin@erepair.com | Admin123!  |
| Technician   | tech@erepair.com  | Tech123!   |

**⚠️ IMPORTANT:** Change these passwords immediately after first login!

### Access Application

Open your browser and navigate to:
```
https://your-domain.com
```

### Deployment Information

All configuration details are saved in:
- **Ubuntu:** `/opt/erepair/DEPLOYMENT_INFO.txt`
- **Windows:** `C:\apps\erepair\DEPLOYMENT_INFO.txt`

This file contains:
- Database credentials
- NextAuth secret
- Service management commands
- Log file locations

---

## Configuration

### Environment Variables

The deployment scripts create a `.env` file with these variables:

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generated-secret"

# Email (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@your-domain.com"
```

### Email Configuration

To enable email notifications:

1. **Get SMTP credentials:**
   - Gmail: Create an App Password
   - Outlook: Use your account password
   - Custom SMTP: Get credentials from provider

2. **Update .env file:**
   ```bash
   # Ubuntu
   sudo -u erepair nano /opt/erepair/.env

   # Windows
   notepad C:\apps\erepair\.env
   ```

3. **Restart application:**
   ```bash
   # Ubuntu
   sudo -u erepair pm2 restart erepair

   # Windows
   Restart-Service ERepair
   ```

4. **Test email in Settings page**

### DNS Configuration

Point your domain to your server:

```
Type: A
Name: @ (or subdomain)
Value: Your server's IP address
TTL: 300 (or default)
```

Verify DNS propagation:
```bash
# Linux/Mac
dig your-domain.com

# Windows
nslookup your-domain.com
```

---

## Troubleshooting

### Ubuntu Issues

**Application not starting:**
```bash
# Check PM2 status
sudo -u erepair pm2 status

# View logs
sudo -u erepair pm2 logs erepair --lines 50

# Restart
sudo -u erepair pm2 restart erepair
```

**Database connection issues:**
```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Test connection
sudo -u postgres psql -d erepair -c "SELECT version();"
```

**502 Bad Gateway:**
```bash
# Check if app is running
sudo -u erepair pm2 status

# Check if port 3000 is listening
sudo netstat -tulpn | grep 3000

# Restart both
sudo -u erepair pm2 restart erepair
sudo systemctl restart nginx
```

**SSL Certificate issues:**
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

### Windows Issues

**Application not starting:**
```powershell
# Check service status
Get-Service ERepair

# View logs
Get-Content C:\apps\erepair\logs\error.log -Tail 50

# Restart service
Restart-Service ERepair
```

**Database connection issues:**
```powershell
# Check PostgreSQL service
Get-Service postgresql-x64-16

# Start if stopped
Start-Service postgresql-x64-16

# Test connection
$env:PGPASSWORD="PostgresPass123!"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d erepair -c "SELECT version();"
```

**Port already in use:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Stop the process (replace PID)
Stop-Process -Id <PID> -Force

# Restart service
Start-Service ERepair
```

**Caddy SSL issues:**
```powershell
# Check Caddy logs
Get-Content C:\apps\erepair\logs\caddy.log -Tail 50

# Verify domain points to server
Resolve-DnsName your-domain.com

# Restart Caddy
Restart-Service ERepairCaddy
```

---

## Security Best Practices

### 1. Change Default Passwords
After first login, change all default user passwords through the Settings page.

### 2. Configure Firewall

**Ubuntu:**
```bash
sudo ufw enable
sudo ufw allow 'Nginx Full'
sudo ufw allow 'OpenSSH'
```

**Windows:**
```powershell
# Firewall rules are created by deployment script
# Verify:
Get-NetFirewallRule -DisplayName "E-Repair*"
```

### 3. Regular Updates

**Ubuntu:**
```bash
sudo apt update && sudo apt upgrade -y
```

**Windows:**
```powershell
# Windows Update
Install-Module PSWindowsUpdate
Get-WindowsUpdate
Install-WindowsUpdate -AcceptAll

# Update packages
choco upgrade all -y
```

### 4. Database Backups

**Ubuntu:**
```bash
# Create backup
sudo -u postgres pg_dump erepair > backup_$(date +%Y%m%d).sql

# Automated daily backups (cron)
sudo crontab -e
# Add: 0 2 * * * pg_dump -U postgres erepair > /backups/erepair_$(date +\%Y\%m\%d).sql
```

**Windows:**
```powershell
# Create backup
$date = Get-Date -Format "yyyyMMdd"
$env:PGPASSWORD="PostgresPass123!"
& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres erepair > "C:\backups\erepair_$date.sql"

# Automated backups (Task Scheduler)
# See deployment documentation for setup
```

### 5. SSL Certificate Monitoring

**Ubuntu:**
SSL certificates auto-renew. Verify:
```bash
sudo systemctl status certbot.timer
```

**Windows:**
Caddy automatically renews certificates. No action required.

---

## Performance Optimization

### Enable HTTP/2
Both Nginx and Caddy support HTTP/2 by default.

### Database Optimization
```sql
-- Run periodically
ANALYZE;
VACUUM ANALYZE;
```

### Monitor Resources

**Ubuntu:**
```bash
# Install monitoring
sudo apt install htop
htop

# Check disk space
df -h

# Check memory
free -h
```

**Windows:**
```powershell
# Resource usage
Get-Process node, postgres | Select Name, CPU, WorkingSet

# Disk space
Get-PSDrive C

# Memory
Get-CimInstance Win32_OperatingSystem | Select FreePhysicalMemory, TotalVisibleMemorySize
```

---

## Support

For deployment issues:
1. Check this documentation
2. Review log files
3. Verify environment variables
4. Check service status
5. Review database connectivity

---

**Last Updated:** October 29, 2025
**Version:** 1.0.0
