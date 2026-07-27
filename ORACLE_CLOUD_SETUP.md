# Oracle Cloud Free Tier Deployment - Mushagashe Portal

## Why Oracle Cloud Always Free?
- **Truly Free**: No time limits, no sleep
- **Powerful**: 2 AMD VMs with 24GB RAM each
- **Permanent**: 99.9% uptime
- **Storage**: 200GB block storage
- **Bandwidth**: 10TB/month
- **Cost**: $0/month forever

## What You Get (Always Free Tier)
- **2 Compute Instances** (AMD): 1/8 OCPU, 1GB RAM each
- **4 ARM Ampere A1 cores**: 24GB RAM
- **200GB Block Volume Storage**
- **10TB/month Egress Bandwidth**
- **Load Balancer**: 1 free
- **Database**: 2 Autonomous Databases (20GB each)

## Setup Guide

### Step 1: Create Oracle Cloud Account
1. Go to https://www.oracle.com/cloud/free/
2. Click "Try Free"
3. Sign up with email
4. **Required**: Credit card for verification (not charged)
5. Choose home region (closest to your students)
   - Recommended: Johannesburg (af-south-1) or Frankfurt (eu-frankfurt-1)

### Step 2: Create Compute Instance
1. Login to Oracle Cloud Console
2. Click "Create" → "Compute Instance"
3. Configure:
   - **Name**: mushagashe-portal
   - **Compartment**: (your compartment)
   - **Shape**: Always Free (AMD)
   - **Operating System**: Oracle Linux 8 or Ubuntu 22.04
   - **SSH Keys**: Create or upload your SSH key
4. Click "Create"

### Step 3: Connect to Instance
**Generate SSH Key (if needed):**
```bash
# On your local machine
ssh-keygen -t rsa -b 4096
# Save as: C:\Users\PC\.ssh\oracle_key
```

**Connect via SSH:**
```bash
ssh -i C:\Users\PC\.ssh\oracle_key opc@your-instance-public-ip
```

### Step 4: Setup Server
```bash
# Update system
sudo dnf update -y  # For Oracle Linux
# OR
sudo apt update && sudo apt upgrade -y  # For Ubuntu

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -  # Oracle Linux
sudo dnf install -y nodejs

# OR for Ubuntu:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install git
sudo dnf install -y git  # Oracle Linux
# OR
sudo apt install -y git  # Ubuntu

# Verify installation
node --version
npm --version
```

### Step 5: Setup Firewall
```bash
# Open port 5000
sudo firewall-cmd --permanent --add-port=5000/tcp  # Oracle Linux
sudo firewall-cmd --reload

# OR for Ubuntu:
sudo ufw allow 22
sudo ufw allow 5000
sudo ufw enable
```

### Step 6: Upload Application
**Option A: Using Git**
```bash
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/vocational-portal.git
sudo chown -R opc:opc vocational-portal
cd vocational-portal/backend
```

**Option B: Using SCP (from local machine)**
```bash
# From your local PowerShell
scp -i C:\Users\PC\.ssh\oracle_key -r C:\Users\PC\CascadeProjects\vocational-portal opc@your-instance-ip:/var/www/
```

### Step 7: Configure Environment
```bash
cd /var/www/vocational-portal/backend
cp .env .env.backup
nano .env
```

Add these values:
```
PORT=5000
NODE_ENV=production
HOST=0.0.0.0
JWT_SECRET=your-very-secure-random-string-here-change-this
ADMIN_EMAIL=admin@mushagashe.edu
ADMIN_PASSWORD=admin123
FRONTEND_URL=*
DB_PATH=/var/www/vocational-portal/backend/database/mushagashe.db
```

### Step 8: Install Dependencies
```bash
cd /var/www/vocational-portal/backend
npm install --production
```

### Step 9: Start Application with PM2
```bash
cd /var/www/vocational-portal/backend
pm2 start server.js --name mushagashe-portal
pm2 save
pm2 startup
```

### Step 10: Configure Oracle Cloud Security List
1. Go to Oracle Cloud Console
2. Networking → Virtual Cloud Networks
3. Click your VCN → Security Lists
4. Add Ingress Rule:
   - **Source**: 0.0.0.0/0
   - **IP Protocol**: TCP
   - **Destination Port**: 5000
   - **Description**: Portal Access

### Step 11: Test Access
```bash
# From your instance
curl http://localhost:5000/health

# From your local machine
curl http://your-instance-public-ip:5000/health
```

### Step 12: Student Access URL
Students will access: `http://your-instance-public-ip:5000`

## Optional: Add Custom Domain

### Step 1: Buy Domain
- Buy domain from Namecheap, GoDaddy, etc.
- Example: portal.mushagashe.edu

### Step 2: Configure DNS
1. Go to your domain registrar
2. Add A record:
   - **Name**: portal (or @)
   - **Value**: your-instance-public-ip
   - **TTL**: 300

### Step 3: Setup Nginx Reverse Proxy
```bash
# Install nginx
sudo dnf install -y nginx  # Oracle Linux
# OR
sudo apt install -y nginx  # Ubuntu

# Configure nginx
sudo nano /etc/nginx/conf.d/mushagashe-portal.conf
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name portal.mushagashe.edu;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo nginx -t
```

### Step 4: Setup SSL with Let's Encrypt
```bash
# Install certbot
sudo dnf install -y certbot python3-certbot-nginx  # Oracle Linux
# OR
sudo apt install -y certbot python3-certbot-nginx  # Ubuntu

# Get SSL certificate
sudo certbot --nginx -d portal.mushagashe.edu

# Auto-renewal (automatic)
sudo certbot renew --dry-run
```

## Maintenance

### Check Application Status
```bash
pm2 status
pm2 logs mushagashe-portal
pm2 monit
```

### Restart Application
```bash
pm2 restart mushagashe-portal
```

### Update Application
```bash
cd /var/www/vocational-portal
git pull
cd backend
npm install --production
pm2 restart mushagashe-portal
```

### Backup Database
```bash
# Create backup script
sudo nano /var/www/backup.sh
```

Add:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /var/www/vocational-portal/backend/database/mushagashe.db /var/www/backups/mushagashe_$DATE.db
# Keep only last 7 backups
find /var/www/backups -name "mushagashe_*.db" -mtime +7 -delete
```

```bash
# Make executable
sudo chmod +x /var/www/backup.sh

# Setup cron job for daily backups
crontab -e
```

Add:
```
0 2 * * * /var/www/backup.sh
```

### Monitor Resources
```bash
# Check CPU/Memory
top

# Check disk space
df -h

# Check network
iftop
```

## Important Notes

**Free Tier Limits:**
- 2 AMD VMs (1/8 OCPU, 1GB RAM each) - Use one for portal
- 200GB storage - Plenty for database
- 10TB bandwidth - More than enough
- No sleep, truly permanent

**Best Practices:**
- Keep system updated
- Monitor resource usage
- Regular database backups
- Use strong passwords
- Keep SSH keys secure

**Troubleshooting:**

**Can't connect to instance:**
- Check security list rules
- Verify firewall settings
- Ensure SSH key is correct

**Application won't start:**
- Check PM2 logs: `pm2 logs`
- Verify environment variables
- Check port 5000 is not in use

**Database issues:**
- Check file permissions
- Verify database path in .env
- Restore from backup if needed

**Performance issues:**
- Monitor with PM2: `pm2 monit`
- Check system resources
- Consider upgrading if needed

## Cost Summary

**Oracle Cloud Always Free:**
- Compute: $0
- Storage: $0 (200GB included)
- Bandwidth: $0 (10TB included)
- **Total: $0/month**

**Optional Domain:**
- Domain name: $10-15/year
- SSL: Free (Let's Encrypt)
- **Total: $1-2/month**

## Advantages Over Other Options

**vs Railway:**
- No sleep (always active)
- More resources
- Truly permanent

**vs DigitalOcean:**
- Free vs $5/month
- More resources
- Oracle infrastructure

**vs Render:**
- No deployment issues
- More control
- Better performance

## Next Steps

1. Create Oracle Cloud account
2. Create compute instance
3. Follow setup steps above
4. Test deployment
5. Share URL with students

This will give you a truly permanent, free hosting solution for your vocational training centre portal.
