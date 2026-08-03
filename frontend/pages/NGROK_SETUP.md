# Ngrok Setup Guide for Mushagashe Portal

## Quick Setup (Easiest Approach)

### Step 1: Install ngrok
1. Download from https://ngrok.com/download
2. Extract and add to PATH
3. Sign up at https://ngrok.com/signup (free)
4. Authenticate: `ngrok config add-authtoken YOUR_TOKEN`

### Step 2: Start Your Servers
Make sure both servers are running locally:
```bash
# Terminal 1 - Backend
cd C:\Users\PC\CascadeProjects\vocational-portal\backend
npm start

# Terminal 2 - Frontend  
cd C:\Users\PC\CascadeProjects\vocational-portal\frontend
node server.cjs
```

### Step 3: Start ngrok
```bash
ngrok http 3000
```

This will give you a public URL like: `https://abc123.ngrok-free.app`

### Step 4: Update Backend CORS
Since ngrok changes the URL, update `backend/.env`:
```
FRONTEND_URL=*
```

### Step 5: Important Note
With ngrok free tier, you can only expose one port. The frontend will be accessible but the backend API needs to be accessible too.

**Two options:**

**Option A: Use ngrok for backend only**
```bash
ngrok http 5000
```
Then serve frontend from backend (requires backend changes).

**Option B: Use two ngrok tunnels (requires paid tier)**
```bash
ngrok http 3000  # Frontend
ngrok http 5000  # Backend (in separate terminal)
```

## Recommended Solution for Free ngrok

### Configure Backend to Serve Frontend
This allows one ngrok tunnel to handle everything:

1. Update `backend/server.js` to serve static files:
```javascript
// Add this before other routes
app.use(express.static(path.join(__dirname, '../frontend')));
```

2. Then use ngrok on backend port:
```bash
ngrok http 5000
```

3. Students access: `https://abc123.ngrok-free.app`

## Alternative: Use Local Network + ngrok

If you want to keep current setup:
1. Use local network URL for students on same WiFi: `http://192.168.0.107:3000`
2. Use ngrok for remote students: `ngrok http 3000`

## Student Access URL

After ngrok is running, give students:
```
https://your-ngrok-url.ngrok-free.app
```

## Important Notes

- **ngrok URLs change** each time you restart ngrok
- **Free tier has limitations**: 1 tunnel, URL changes, bandwidth limits
- **For permanent access**, use cloud deployment (Render/Vercel)
- **Keep ngrok running** for students to access
- **HTTPS is automatic** with ngrok

## Troubleshooting

**Frontend loads but can't connect to API:**
- Check backend is running on port 5000
- Check CORS settings in backend
- Try using backend-only ngrok approach

**ngrok URL not working:**
- Check ngrok is running
- Check firewall settings
- Verify servers are running locally

**URL changes on restart:**
- This is normal with ngrok free tier
- Consider paid ngrok or cloud deployment for permanent URLs
