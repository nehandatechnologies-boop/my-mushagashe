# Deployment Guide - Mushagashe Vocational Training Centre Portal

## Free Cloud Deployment Options

### Option 1: Render.com (Recommended - Free Tier)

**Backend + Frontend on Render**

#### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up for a free account
3. Connect your GitHub account

#### Step 2: Deploy Backend
1. Push your code to GitHub
2. In Render dashboard, click "New +"
3. Select "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: mushagashe-backend
   - **Runtime**: Node
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free
6. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `5000`
   - `HOST` = `0.0.0.0`
   - `JWT_SECRET` = (generate a secure random string)
   - `ADMIN_EMAIL` = `admin@mushagashe.edu`
   - `ADMIN_PASSWORD` = `admin123`
   - `FRONTEND_URL` = `https://your-frontend-url.onrender.com`
7. Click "Deploy Web Service"
8. Wait for deployment (2-3 minutes)
9. Copy the backend URL (e.g., `https://mushagashe-backend.onrender.com`)

#### Step 3: Deploy Frontend
1. In Render dashboard, click "New +"
2. Select "Static Site"
3. Connect your GitHub repository
4. Configure:
   - **Name**: mushagashe-frontend
   - **Build Command**: `cd frontend && npm install`
   - **Publish Directory**: `frontend`
   - **Plan**: Free
5. Add Environment Variables:
   - `API_URL` = `https://mushagashe-backend.onrender.com`
6. Click "Deploy Static Site"
7. Wait for deployment (1-2 minutes)
8. Copy the frontend URL (e.g., `https://mushagashe-frontend.onrender.com`)

#### Step 4: Update Frontend API Configuration
The JavaScript files are already configured to detect Render URLs automatically.

### Option 2: Vercel (Frontend) + Render (Backend)

**Better for frontend performance**

#### Step 1: Deploy Backend on Render (Same as above)

#### Step 2: Deploy Frontend on Vercel
1. Go to https://vercel.com
2. Sign up for free account
3. Connect GitHub repository
4. Import your project
5. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `frontend`
   - **Build Command**: Leave empty (static files)
   - **Output Directory**: `.` (current directory)
6. Add Environment Variable:
   - `API_URL` = `https://mushagashe-backend.onrender.com`
7. Click "Deploy"
8. Copy the Vercel URL

#### Step 3: Update Backend CORS
Update `backend/.env`:
```
FRONTEND_URL=https://your-vercel-url.vercel.app
```

### Option 3: Railway (Alternative to Render)

1. Go to https://railway.app
2. Sign up for free account
3. Click "New Project"
4. Deploy from GitHub
5. Railway will auto-detect Node.js
6. Add environment variables
7. Deploy

## Important Notes

### Database Persistence
- Render free tier uses ephemeral storage (data lost on redeploy)
- For production, upgrade to paid tier or use external database (PostgreSQL)
- Current SQLite database will reset on each deployment

### Security
- Change default admin password after first deployment
- Use strong JWT_SECRET in production
- Enable HTTPS (automatic on Render/Vercel)

### Performance
- Free tiers have limited resources
- May experience cold starts (first request takes longer)
- Suitable for small-scale usage (<100 students)

## Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Backend deployed with environment variables
- [ ] Frontend deployed with correct API URL
- [ ] CORS configured correctly
- [ ] Test student registration
- [ ] Test student login
- [ ] Test admin login
- [ ] Test dashboard functionality

## Access URLs After Deployment

**Students will access:** `https://your-frontend-url.onrender.com`

**Admin will access:** `https://your-frontend-url.onrender.com/admin-login.html`

## Troubleshooting

### Backend won't start
- Check build logs in Render dashboard
- Verify all environment variables are set
- Ensure `package.json` has correct start script

### Frontend can't connect to backend
- Verify API_URL is correct
- Check CORS settings in backend
- Check backend is running (visit backend URL directly)

### Database issues
- Free tier SQLite resets on redeploy
- Consider upgrading to PostgreSQL for persistence
- Create database initialization script for production

## Cost Summary

**Render Free Tier:**
- Backend: $0/month (750 hours/month)
- Frontend: $0/month (100GB bandwidth/month)
- Total: $0/month

**Vercel Free Tier:**
- Frontend: $0/month (100GB bandwidth/month)
- Backend on Render: $0/month
- Total: $0/month

**Paid Tier (if needed):**
- Render Starter: $7/month (better performance, persistent storage)
- Vercel Pro: $20/month (more bandwidth, faster builds)
