# Deployment Scripts

This directory contains scripts for deploying and managing the eRepair Shop application.

## Available Scripts

### 1. deploy.sh (Full Deployment)
The main deployment script with comprehensive logging and error handling.

**Features:**
- Automatic backup of .env and database schema
- Stashes local changes before pulling
- Pulls latest changes from Git
- Installs dependencies
- Updates database schema
- Builds the application
- Restarts PM2 with zero-downtime reload
- Detailed logging to `logs/deploy-YYYYMMDD-HHMMSS.log`

**Usage:**
```bash
./scripts/deploy.sh
```

**What it does:**
1. Creates backup in `backups/deploy-YYYYMMDD-HHMMSS/`
2. Stashes any uncommitted changes
3. Pulls from `origin/master`
4. Runs `npm install`
5. Runs database migrations (`db:generate` and `db:push`)
6. Builds the Next.js app
7. Reloads/restarts PM2 process
8. Shows deployment status

---

### 2. quick-deploy.sh (Fast Deployment)
A streamlined deployment script for quick updates without extensive logging.

**Features:**
- Faster execution
- Minimal output
- Same deployment steps as full deployment
- No backup creation

**Usage:**
```bash
./scripts/quick-deploy.sh
```

**Best for:**
- Small updates
- Quick bug fixes
- When you don't need detailed logs

---

### 3. rollback.sh (Rollback to Previous Version)
Rollback the application to a specific Git commit.

**Features:**
- Interactive confirmation
- Shows commit details before rollback
- Creates backup before rollback
- Rebuilds and restarts application

**Usage:**
```bash
# View recent commits
git log --oneline -10

# Rollback to specific commit
./scripts/rollback.sh <commit-hash>

# Example:
./scripts/rollback.sh abc1234
```

**What it does:**
1. Verifies the commit exists
2. Shows commit details
3. Asks for confirmation
4. Creates backup
5. Resets to specified commit
6. Reinstalls dependencies
7. Updates database
8. Rebuilds application
9. Restarts PM2

---

## Quick Reference

### Deploy latest changes
```bash
./scripts/deploy.sh
```

### Quick deploy (faster)
```bash
./scripts/quick-deploy.sh
```

### View deployment logs
```bash
ls -lt logs/deploy-*.log | head -5
tail -f logs/deploy-*.log
```

### Rollback to previous version
```bash
git log --oneline -10
./scripts/rollback.sh <commit-hash>
```

### Check application status
```bash
pm2 status erepair-shop
pm2 logs erepair-shop
```

---

## Directory Structure

```
/home/epladmin/erepair/
├── scripts/
│   ├── deploy.sh          # Full deployment script
│   ├── quick-deploy.sh    # Quick deployment script
│   ├── rollback.sh        # Rollback script
│   └── README.md          # This file
├── logs/
│   └── deploy-*.log       # Deployment logs
└── backups/
    ├── deploy-*/          # Deployment backups
    └── rollback-*/        # Rollback backups
```

---

## Troubleshooting

### Script permission denied
```bash
chmod +x scripts/*.sh
```

### PM2 process not found
```bash
# Start the application
pm2 start ecosystem.config.js
pm2 save
```

### Build fails
```bash
# Check the deployment log
tail -100 logs/deploy-*.log

# Or run build manually
npm run build
```

### Database migration issues
```bash
# Reset database (WARNING: This will delete data)
npx prisma db push --force-reset

# Or just regenerate client
npm run db:generate
```

### Application not starting
```bash
# Check PM2 logs
pm2 logs erepair-shop

# Check error logs
tail -50 logs/pm2-error.log
```

---

## Best Practices

1. **Always test locally first** before deploying to production
2. **Use the full deploy.sh** for important updates (creates backups)
3. **Use quick-deploy.sh** for minor changes
4. **Check logs** after deployment: `pm2 logs erepair-shop`
5. **Monitor the application** after deployment for errors
6. **Keep backups** for at least 30 days

---

## Automation (Optional)

### Setup cron job for automatic deployment
```bash
# Edit crontab
crontab -e

# Add daily deployment at 2 AM
0 2 * * * cd /home/epladmin/erepair && ./scripts/deploy.sh
```

### Setup PM2 startup on boot
```bash
pm2 startup
pm2 save
```
