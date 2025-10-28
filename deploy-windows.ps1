#############################################
# E-Repair Shop - Windows Deployment Script
#############################################
# Automated deployment for Windows Server
# Includes PostgreSQL, Node.js, Caddy, NSSM

#Requires -RunAsAdministrator

# Configuration
$GIT_REPO = "https://github.com/YOUR_USERNAME/erepair.git"  # UPDATE THIS
$INSTALL_DIR = "C:\apps\erepair"
$DOMAIN = "erepair.yourdomain.com"  # UPDATE THIS
$APP_PORT = 3000
$DB_NAME = "erepair"
$DB_USER = "postgres"
$EMAIL = "admin@yourdomain.com"  # For SSL certificate

# Functions
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warning { Write-Host "[WARNING] $args" -ForegroundColor Yellow }
function Write-ErrorMsg { Write-Host "[ERROR] $args" -ForegroundColor Red }

function Test-CommandExists {
    param($Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function New-RandomPassword {
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%"
    $password = -join ((1..25) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
    return $password
}

# Welcome
Clear-Host
Write-Host "============================================" -ForegroundColor Blue
Write-Host "  E-Repair Shop - Windows Deployment       " -ForegroundColor Blue
Write-Host "============================================" -ForegroundColor Blue
Write-Host ""
Write-Info "This script will deploy the complete E-Repair system."
Write-Host ""
$continue = Read-Host "Press Enter to continue or Ctrl+C to cancel"

#############################################
# Step 1: Check Chocolatey
#############################################
Write-Info "Step 1: Checking Chocolatey..."
if (-not (Test-CommandExists choco)) {
    Write-Info "Installing Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    refreshenv
    Write-Success "Chocolatey installed"
} else {
    Write-Warning "Chocolatey already installed"
}
Write-Host ""

#############################################
# Step 2: Install PostgreSQL
#############################################
Write-Info "Step 2: Checking PostgreSQL..."
if (-not (Test-CommandExists psql)) {
    Write-Info "Installing PostgreSQL 16..."
    choco install postgresql16 -y --params '/Password:PostgresPass123!'
    refreshenv
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Success "PostgreSQL installed"
} else {
    Write-Warning "PostgreSQL already installed"
}
Write-Host ""

#############################################
# Step 3: Install Node.js
#############################################
Write-Info "Step 3: Checking Node.js..."
if (-not (Test-CommandExists node)) {
    Write-Info "Installing Node.js 20..."
    choco install nodejs-lts -y --version=20.12.2
    refreshenv
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Success "Node.js installed"
} else {
    $nodeVersion = node --version
    Write-Warning "Node.js already installed: $nodeVersion"
}
Write-Host ""

#############################################
# Step 4: Install Git
#############################################
Write-Info "Step 4: Checking Git..."
if (-not (Test-CommandExists git)) {
    Write-Info "Installing Git..."
    choco install git -y
    refreshenv
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Success "Git installed"
} else {
    Write-Warning "Git already installed"
}
Write-Host ""

#############################################
# Step 5: Install Caddy
#############################################
Write-Info "Step 5: Checking Caddy..."
if (-not (Test-CommandExists caddy)) {
    Write-Info "Installing Caddy web server..."
    choco install caddy -y
    refreshenv
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Success "Caddy installed"
} else {
    Write-Warning "Caddy already installed"
}
Write-Host ""

#############################################
# Step 6: Install NSSM
#############################################
Write-Info "Step 6: Checking NSSM..."
if (-not (Test-CommandExists nssm)) {
    Write-Info "Installing NSSM..."
    choco install nssm -y
    refreshenv
    Write-Success "NSSM installed"
} else {
    Write-Warning "NSSM already installed"
}
Write-Host ""

#############################################
# Step 7: Clone Repository
#############################################
Write-Info "Step 7: Setting up application..."
if (Test-Path $INSTALL_DIR) {
    Write-Warning "Directory exists, pulling latest..."
    Set-Location $INSTALL_DIR
    git pull
} else {
    Write-Info "Creating directory: $INSTALL_DIR"
    New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
    Write-Info "Cloning repository..."
    git clone $GIT_REPO $INSTALL_DIR
    Set-Location $INSTALL_DIR
    Write-Success "Repository cloned"
}
Write-Host ""

#############################################
# Step 8: Setup Database
#############################################
Write-Info "Step 8: Setting up database..."
$DB_PASSWORD = New-RandomPassword

# Start PostgreSQL service
Start-Service postgresql-x64-16 -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Create database
$env:PGPASSWORD = "PostgresPass123!"
$createDbScript = @"
CREATE DATABASE $DB_NAME;
"@

$createDbScript | & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost

Write-Success "Database created"
Write-Host ""

#############################################
# Step 9: Create .env File
#############################################
Write-Info "Step 9: Creating environment configuration..."
$NEXTAUTH_SECRET = New-RandomPassword
$DATABASE_URL = "postgresql://${DB_USER}:PostgresPass123!@localhost:5432/${DB_NAME}"

$envContent = @"
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
"@

$envContent | Out-File -FilePath "$INSTALL_DIR\.env" -Encoding UTF8
Write-Success "Environment configured"
Write-Host ""

#############################################
# Step 10: Install Dependencies
#############################################
Write-Info "Step 10: Installing Node.js dependencies..."
Set-Location $INSTALL_DIR
npm install
Write-Success "Dependencies installed"
Write-Host ""

#############################################
# Step 11: Run Database Migrations
#############################################
Write-Info "Step 11: Running database migrations..."
$env:DATABASE_URL = $DATABASE_URL
npx prisma generate
npx prisma db push
npx prisma db seed
Write-Success "Database initialized"
Write-Host ""

#############################################
# Step 12: Build Application
#############################################
Write-Info "Step 12: Building application..."
npm run build
Write-Success "Application built"
Write-Host ""

#############################################
# Step 13: Configure Caddy
#############################################
Write-Info "Step 13: Configuring Caddy..."
$caddyConfig = @"
{
    email $EMAIL
}

$DOMAIN {
    reverse_proxy localhost:$APP_PORT {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    # Security headers
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "no-referrer-when-downgrade"
        -Server
    }

    # Logging
    log {
        output file $INSTALL_DIR/logs/caddy-access.log
        format json
    }

    # File upload size
    request_body {
        max_size 50MB
    }
}
"@

New-Item -ItemType Directory -Path "$INSTALL_DIR\logs" -Force | Out-Null
$caddyConfig | Out-File -FilePath "$INSTALL_DIR\Caddyfile" -Encoding UTF8
Write-Success "Caddy configured"
Write-Host ""

#############################################
# Step 14: Create Windows Services
#############################################
Write-Info "Step 14: Creating Windows services..."

# Create E-Repair App Service
Write-Info "Creating E-Repair application service..."
nssm install ERepair "C:\Program Files\nodejs\node.exe"
nssm set ERepair AppDirectory $INSTALL_DIR
nssm set ERepair AppParameters "node_modules\.bin\next start"
nssm set ERepair AppEnvironmentExtra "NODE_ENV=production" "PORT=$APP_PORT" "DATABASE_URL=$DATABASE_URL"
nssm set ERepair DisplayName "E-Repair Shop Application"
nssm set ERepair Description "E-Repair Shop Management System"
nssm set ERepair Start SERVICE_AUTO_START
nssm set ERepair AppStdout "$INSTALL_DIR\logs\app.log"
nssm set ERepair AppStderr "$INSTALL_DIR\logs\error.log"
nssm set ERepair AppRotateFiles 1
nssm set ERepair AppRotateBytes 1048576

# Create Caddy Service
Write-Info "Creating Caddy service..."
nssm install ERepairCaddy "C:\ProgramData\chocolatey\bin\caddy.exe"
nssm set ERepairCaddy AppDirectory $INSTALL_DIR
nssm set ERepairCaddy AppParameters "run --config $INSTALL_DIR\Caddyfile"
nssm set ERepairCaddy DisplayName "E-Repair Caddy Web Server"
nssm set ERepairCaddy Description "Caddy reverse proxy for E-Repair"
nssm set ERepairCaddy Start SERVICE_AUTO_START
nssm set ERepairCaddy AppStdout "$INSTALL_DIR\logs\caddy.log"
nssm set ERepairCaddy AppStderr "$INSTALL_DIR\logs\caddy-error.log"

# Start services
Write-Info "Starting services..."
Start-Service ERepair
Start-Service ERepairCaddy

Write-Success "Services created and started"
Write-Host ""

#############################################
# Step 15: Configure Firewall
#############################################
Write-Info "Step 15: Configuring Windows Firewall..."
New-NetFirewallRule -DisplayName "E-Repair HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "E-Repair HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow -ErrorAction SilentlyContinue
Write-Success "Firewall configured"
Write-Host ""

#############################################
# Save Configuration
#############################################
$deploymentInfo = @"
E-Repair Shop - Deployment Information
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Installation: $INSTALL_DIR
Domain: https://$DOMAIN
Port: $APP_PORT

Database:
- Name: $DB_NAME
- User: $DB_USER
- Password: PostgresPass123!
- URL: $DATABASE_URL

NextAuth Secret: $NEXTAUTH_SECRET

Default Login:
- Admin: admin@erepair.com / Admin123!
- Tech: tech@erepair.com / Tech123!

Service Management:
- Start App:     Start-Service ERepair
- Stop App:      Stop-Service ERepair
- Restart App:   Restart-Service ERepair
- Start Caddy:   Start-Service ERepairCaddy
- Stop Caddy:    Stop-Service ERepairCaddy

Application Logs:
- App:   $INSTALL_DIR\logs\app.log
- Error: $INSTALL_DIR\logs\error.log
- Caddy: $INSTALL_DIR\logs\caddy.log

Update Application:
  cd $INSTALL_DIR
  git pull
  npm install
  npx prisma generate
  npx prisma db push
  npm run build
  Restart-Service ERepair

Service Configuration (NSSM):
- Edit service: nssm edit ERepair
- Remove service: nssm remove ERepair confirm
"@

$deploymentInfo | Out-File -FilePath "$INSTALL_DIR\DEPLOYMENT_INFO.txt" -Encoding UTF8

#############################################
# Final Summary
#############################################
Clear-Host
Write-Host "============================================" -ForegroundColor Green
Write-Host "       DEPLOYMENT COMPLETED! 🎉" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Success "E-Repair Shop successfully deployed!"
Write-Host ""
Write-Host "Domain: https://$DOMAIN" -ForegroundColor Cyan
Write-Host "Installation: $INSTALL_DIR" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services Status:" -ForegroundColor Yellow
Get-Service ERepair, ERepairCaddy | Format-Table -AutoSize
Write-Host ""
Write-Host "Default credentials saved to: $INSTALL_DIR\DEPLOYMENT_INFO.txt" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Ensure DNS points $DOMAIN to this server" -ForegroundColor White
Write-Host "2. Caddy will automatically obtain SSL certificate" -ForegroundColor White
Write-Host "3. Change default passwords after first login" -ForegroundColor White
Write-Host "4. Monitor logs in: $INSTALL_DIR\logs\" -ForegroundColor White
Write-Host ""
Write-Success "Deployment complete!"
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
