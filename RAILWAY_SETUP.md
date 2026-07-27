# Free Permanent Deployment - Railway

## Why Railway?
- **Free tier**: $5 credit/month (enough for small apps)
- **Easy setup**: Auto-detects Node.js
- **Permanent URLs**: Custom domains available
- **Built-in database**: PostgreSQL included
- **No credit card required** for free tier

## Setup Steps

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Click "Start a new project"
3. Sign up with GitHub (free)
4. You get $5 credit/month (renews monthly)

### Step 2: Deploy Backend
1. Click "New Project" → "Deploy from GitHub repo"
2. Select your `vocational-portal` repository
3. Railway will auto-detect Node.js
4. Click "Deploy"

### Step 3: Configure Backend
1. Click on your backend service
2. Go to "Variables" tab
3. Add these environment variables:
   ```
   NODE_ENV=production
   PORT=5000
   HOST=0.0.0.0
   JWT_SECRET=your-secure-random-string-here
   ADMIN_EMAIL=admin@mushagashe.edu
   ADMIN_PASSWORD=admin123
   FRONTEND_URL=*
   DB_PATH=/data/mushagashe.db
   ```

### Step 4: Add Persistent Disk (Important)
1. Go to your backend service
2. Click "Settings" → "Volumes"
3. Add volume:
   - **Name**: database
   - **Mount path**: /data
4. This ensures database persists across deployments

### Step 5: Update Database Path
Since Railway uses volumes, update `backend/.env`:
```
DB_PATH=/data/mushagashe.db
```

### Step 6: Deploy Frontend
1. Click "New Service" → "Static Site"
2. Select same repository
3. Configure:
   - **Root directory**: frontend
   - **Build command**: (leave empty)
   - **Output directory**: .
4. Add environment variable:
   ```
   API_URL=https://your-backend-url.railway.app
   ```

### Step 7: Get Your URLs
After deployment, Railway will provide:
- Backend URL: `https://your-backend-url.railway.app`
- Frontend URL: `https://your-frontend-url.railway.app`

### Step 8: Update Frontend API Configuration
The JavaScript files already detect Railway URLs automatically.

## Important Notes

**Free Tier Limitations:**
- $5 credit/month (usually enough for small apps)
- App sleeps after 30 minutes of inactivity
- Wakes up on first request (takes 10-30 seconds)
- URL remains the same (unlike ngrok)

**To Keep App Awake:**
- Use a cron job to ping your app every 15 minutes
- Or upgrade to paid plan ($5/month) for no sleep

**Database Persistence:**
- The volume setup ensures database persists
- Even when app sleeps, data is saved

## Student Access URL
Students will access: `https://your-frontend-url.railway.app`

## Alternative: Oracle Cloud Free Tier

If Railway doesn't work, Oracle Cloud offers:
- **Always Free**: 2 AMD VMs with 24GB RAM
- **Truly permanent**: No sleep
- **More complex setup**: Requires Linux knowledge
- **Setup time**: 1-2 hours

## Quick Railway Setup Commands

If deployment fails, try these manual steps:

**Backend Setup:**
1. In Railway, create new project
2. Select "Empty Project"
3. Add "PostgreSQL" database service
4. Add "Node.js" service
5. Connect GitHub repository
6. Set root directory to `backend`
7. Add environment variables
8. Deploy

**Frontend Setup:**
1. Add "Static" service
2. Set root directory to `frontend`
3. Add API_URL variable
4. Deploy

## Troubleshooting

**Deployment fails:**
- Check build logs in Railway dashboard
- Verify all dependencies in package.json
- Ensure environment variables are set

**Database issues:**
- Make sure volume is mounted to /data
- Check DB_PATH points to /data
- Verify database file exists

**Frontend can't connect:**
- Check API_URL is correct
- Verify backend is running
- Check CORS settings

## Next Steps

1. Create Railway account
2. Deploy backend with database volume
3. Deploy frontend
4. Test student registration and login
5. Share the Railway URL with students

The Railway free tier should work well for your needs and provide a permanent URL for students.
