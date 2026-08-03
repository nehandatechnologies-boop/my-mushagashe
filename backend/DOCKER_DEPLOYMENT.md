# Docker Deployment Guide - Mushagashe Portal

## Free Docker Hosting Options

### Option 1: Fly.io (Recommended - Free Tier)
**Best for:** Easy Docker deployment, permanent URLs, good free tier

**Free Tier:**
- 3 shared-cpu-1x VMs
- 3GB RAM total
- 3GB volume storage
- Permanent URLs
- Global deployment

**Setup Time:** 15-20 minutes

---

### Option 2: Heroku (Free Tier)
**Best for:** Simple Docker deployment, reliable

**Free Tier:**
- 1 web dyno (512MB RAM)
- 550 hours/month
- Sleeps after 30 min inactivity
- Docker support

**Setup Time:** 10-15 minutes

---

### Option 3: AWS ECS (Free Tier)
**Best for:** Professional, scalable

**Free Tier:**
- 750 hours/month Fargate
- 20GB EBS storage
- More complex setup

**Setup Time:** 1-2 hours

---

## Recommended: Fly.io Deployment

### Step 1: Install Fly CLI
```bash
# Windows PowerShell
iwr https://fly.io/install.ps1 -useb | iex
```

### Step 2: Create Fly Account
```bash
fly auth signup
```

### Step 3: Login
```bash
fly auth login
```

### Step 4: Initialize Fly App
```bash
cd C:\Users\PC\CascadeProjects\vocational-portal
fly launch
```

**Configuration:**
- App name: mushagashe-portal
- Region: Choose closest (e.g., Johannesburg if available)
- Dockerfile: Select existing Dockerfile

### Step 5: Configure Environment Variables
```bash
fly secrets set NODE_ENV=production
fly secrets set PORT=5000
fly secrets set HOST=0.0.0.0
fly secrets set JWT_SECRET=your-secure-random-string-here
fly secrets set ADMIN_EMAIL=admin@mushagashe.edu
fly secrets set ADMIN_PASSWORD=admin123
fly secrets set FRONTEND_URL=*
fly secrets set DB_PATH=/app/database/mushagashe.db
```

### Step 6: Add Persistent Volume
```bash
fly volumes create database --size 1
```

### Step 7: Deploy
```bash
fly deploy
```

### Step 8: Get Your URL
Fly will provide: `https://mushagashe-portal.fly.dev`

### Step 9: Student Access
Students access: `https://mushagashe-portal.fly.dev`

---

## Alternative: Heroku Docker Deployment

### Step 1: Install Heroku CLI
Download from: https://devcenter.heroku.com/articles/heroku-cli

### Step 2: Login
```bash
heroku login
```

### Step 3: Create Heroku App
```bash
heroku create mushagashe-portal
```

### Step 4: Set Buildpack to Docker
```bash
heroku buildpacks:set https://github.com/heroku/heroku-buildpack-docker.git
```

### Step 5: Set Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set PORT=5000
heroku config:set HOST=0.0.0.0
heroku config:set JWT_SECRET=your-secure-random-string
heroku config:set ADMIN_EMAIL=admin@mushagashe.edu
heroku config:set ADMIN_PASSWORD=admin123
heroku config:set FRONTEND_URL=*
heroku config:set DB_PATH=/app/database/mushagashe.db
```

### Step 6: Deploy
```bash
heroku container:push web -a mushagashe-portal
heroku container:release web -a mushagashe-portal
```

### Step 7: Get URL
```bash
heroku open -a mushagashe-portal
```

### Step 8: Student Access
Students access: `https://mushagashe-portal.herokuapp.com`

---

## Local Docker Testing

### Build Docker Image
```bash
cd C:\Users\PC\CascadeProjects\vocational-portal
docker build -t mushagashe-portal .
```

### Run Container
```bash
docker run -d \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e HOST=0.0.0.0 \
  -e JWT_SECRET=your-secret \
  -e ADMIN_EMAIL=admin@mushagashe.edu \
  -e ADMIN_PASSWORD=admin123 \
  -e FRONTEND_URL=* \
  -v $(pwd)/database:/app/database \
  --name mushagashe-portal \
  mushagashe-portal
```

### Test Locally
```bash
curl http://localhost:5000/health
```

### Stop Container
```bash
docker stop mushagashe-portal
docker rm mushagashe-portal
```

---

## Docker Hub (Optional)

### Push to Docker Hub
```bash
docker login
docker tag mushagashe-portal your-dockerhub-username/mushagashe-portal
docker push your-dockerhub-username/mushagashe-portal
```

---

## Comparison

| Platform | Free Tier | Sleep | Setup Time | Permanent URL |
|----------|-----------|-------|-------------|---------------|
| Fly.io | Yes | No | 20 min | Yes |
| Heroku | Yes | Yes | 15 min | Yes |
| AWS ECS | Yes | No | 2 hours | Yes |
| Railway | Yes | Yes | 10 min | Yes |

---

## Recommendation: Fly.io

**Why Fly.io?**
- No sleep (always active)
- Free tier is generous
- Easy Docker deployment
- Permanent URL
- Global deployment options
- Good for small apps

**Total Cost:** $0/month

**Student Access:** `https://mushagashe-portal.fly.dev`

---

## Next Steps

1. Install Fly CLI
2. Create Fly account
3. Initialize and deploy
4. Configure environment variables
5. Add persistent volume
6. Test deployment
7. Share URL with students

This will give you a permanent, free Docker deployment with no sleep and reliable uptime.
