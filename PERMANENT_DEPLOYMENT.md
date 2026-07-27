# Permanent Deployment Guide - Mushagashe Vocational Training Centre Portal

## Permanent Deployment Options

### Option 1: Paid ngrok (Easiest - $10/month)
**Best for:** Quick setup, minimal changes, keeps current architecture

**Setup:**
1. Sign up for ngrok paid plan at https://ngrok.com/pricing
2. Upgrade to paid tier ($10/month)
3. Get reserved domain: `portal.mushagashe.edu.ngrok-free.app`
4. Configure ngrok to use reserved domain
5. Keep your current server setup

**Pros:**
- Minimal setup time (5 minutes)
- No code changes needed
- HTTPS automatic
- Fixed URL
- Works immediately

**Cons:**
- $10/month recurring cost
- Still requires your computer to stay on
- Limited bandwidth

**Student URL:** `https://portal.mushagashe.edu.ngrok-free.app`

---

### Option 2: DigitalOcean VPS (Recommended - $5/month)
**Best for:** Professional hosting, full control, reliable

**Setup:**
1. Create DigitalOcean account: https://www.digitalocean.com
2. Create droplet (VPS):
   - OS: Ubuntu 22.04
   - Plan: Basic ($5/month)
   - Region: Choose closest to your students
3. SSH into server
4. Install Node.js and setup portal
5. Configure domain name (optional)

**Installation Commands:**
```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Clone your repository (or upload files)
git clone https://github.com/YOUR_USERNAME/vocational-portal.git
cd vocational-portal/backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
nano .env  # Add your environment variables

# Start with PM2
pm2 start server.js --name mushagashe-portal
pm2 save
pm2 startup
```

**Pros:**
- Very affordable ($5/month)
- Professional hosting
- 24/7 uptime
- Full control
- Can handle many students
- Can add custom domain

**Cons:**
- Requires basic Linux knowledge
- 15-30 minutes setup time
- Need to manage server updates

**Student URL:** `http://your-server-ip:5000` or custom domain

---

### Option 3: Render Paid Tier ($7/month)
**Best for:** Cloud hosting, no server management

**Setup:**
1. Go to Render dashboard
2. Upgrade your backend service to paid tier ($7/month)
3. Add persistent disk for database ($5/month optional)
4. Configure custom domain (optional)

**Configuration:**
- **Backend:** Web Service (Paid)
- **Frontend:** Static Site (Free)
- **Database:** PostgreSQL ($7/month) or SQLite with disk

**Pros:**
- No server management
- Automatic scaling
- Easy deployment
- Professional infrastructure

**Cons:**
- More expensive ($7-19/month)
- Deployment issues we experienced
- May need debugging

**Student URL:** `https://mushagashe-backend.onrender.com`

---

### Option 4: Railway ($5/month)
**Best for:** Simple cloud deployment, good free tier

**Setup:**
1. Go to https://railway.app
2. Connect GitHub repository
3. Railway auto-detects Node.js
4. Add environment variables
5. Deploy

**Pros:**
- Simple setup
- Good free tier
- Auto-scaling
- Built-in database options

**Cons:**
- Free tier has limits
- URL changes on free tier
- Paid tier $5/month

---

## Recommended Solution: DigitalOcean VPS

**Why DigitalOcean?**
- Most cost-effective ($5/month)
- Professional and reliable
- Full control over your application
- Can scale as needed
- Can add custom domain name
- 99.9% uptime guarantee

**Total Monthly Cost:**
- VPS: $5/month
- Optional domain: $12/year ($1/month)
- **Total: $5-6/month**

**Setup Time:** 20-30 minutes

**Student Access:** Permanent URL with optional custom domain

---

## Quick Start: DigitalOcean Setup

### Step 1: Create Account
1. Go to https://www.digitalocean.com
2. Sign up (free $200 credit for new users)
3. Add payment method

### Step 2: Create Droplet
1. Click "Create" → "Droplets"
2. Choose:
   - **Region**: Johannesburg (closest to Zimbabwe)
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic - $5/month
   - **Authentication**: SSH keys (recommended) or Password
3. Click "Create Droplet"

### Step 3: Connect to Server
```bash
ssh root@your-droplet-ip
```

### Step 4: Install Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs git

# Install PM2
npm install -g pm2

# Verify installation
node --version
npm --version
```

### Step 5: Upload Your Application
**Option A: Using Git**
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/vocational-portal.git
cd vocational-portal/backend
```

**Option B: Using SCP (from your local machine)**
```bash
# From your local PowerShell
scp -r C:\Users\PC\CascadeProjects\vocational-portal root@your-server-ip:/var/www/
```

### Step 6: Configure Environment
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
JWT_SECRET=your-secure-random-string-here
ADMIN_EMAIL=admin@mushagashe.edu
ADMIN_PASSWORD=admin123
FRONTEND_URL=*
```

### Step 7: Install Dependencies and Start
```bash
cd /var/www/vocational-portal/backend
npm install
pm2 start server.js --name mushagashe-portal
pm2 save
pm2 startup
```

### Step 8: Configure Firewall
```bash
ufw allow 22
ufw allow 5000
ufw enable
```

### Step 9: Test Access
```bash
curl http://localhost:5000/health
```

### Step 10: Student Access URL
Students will access: `http://your-server-ip:5000`

**Optional: Add Custom Domain**
1. Buy domain (e.g., portal.mushagashe.edu)
2. Point DNS to your server IP
3. Configure nginx reverse proxy
4. Setup SSL with Let's Encrypt

---

## Maintenance

**Check server status:**
```bash
pm2 status
pm2 logs mushagashe-portal
```

**Restart application:**
```bash
pm2 restart mushagashe-portal
```

**Update application:**
```bash
cd /var/www/vocational-portal
git pull
cd backend
npm install
pm2 restart mushagashe-portal
```

**Backup database:**
```bash
cp /var/www/vocational-portal/backend/database/mushagashe.db /backup/
```

---

## Cost Comparison

| Service | Monthly Cost | Setup Time | Reliability |
|---------|-------------|------------|-------------|
| Paid ngrok | $10 | 5 min | High (depends on your PC) |
| DigitalOcean | $5 | 30 min | Very High |
| Render Paid | $7-19 | 10 min | High |
| Railway | $5 | 15 min | High |

---

## Recommendation

**For immediate permanent access:** DigitalOcean VPS ($5/month)

**For minimal setup:** Paid ngrok ($10/month)

**For cloud hosting:** Render or Railway ($5-19/month)

---

## Next Steps

1. Choose your preferred option
2. I can help you set it up step by step
3. Test the deployment
4. Provide final student access URL

Which option would you like to proceed with?
