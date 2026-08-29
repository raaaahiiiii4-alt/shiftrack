# ShiftTrack Frontend - Vercel Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL (Frontend)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  index.html + app.js + styles.css (Static + Edge)      │   │
│  │  API_BASE = https://your-backend.onrender.com/api       │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS API Calls
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RENDER/RAILWAY/FLY (Backend)               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Express API + MongoDB Atlas                            │   │
│  │  GET/POST/PATCH/DELETE /api/tokens                      │   │
│  │  GET /api/export/monthly                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Deploy (3 Steps)

### 1️⃣ Deploy Backend First (Required)
Deploy backend to **Render**, **Railway**, or **Fly.io** first:
```bash
# See DEPLOYMENT.md for full backend deploy instructions
# Get your backend URL: https://shiftrack-api.onrender.com
```

### 2️⃣ Push to GitHub
```bash
cd E:\Project\SKK-main
git add .
git commit -m "Vercel frontend config"
git push origin main
```

### 3️⃣ Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. **Framework Preset**: Other
4. **Build Command**: `npm run build:vercel`
5. **Output Directory**: `.` (root)
6. **Install Command**: `npm install`
7. Add Environment Variable:
   - **Name**: `VERCEL_API_BASE`
   - **Value**: `https://your-backend.onrender.com/api` (your backend URL + `/api`)
8. Click **Deploy**

---

## Configuration Files Created

| File | Purpose |
|------|---------|
| `vercel.json` | Vercel project configuration |
| `build-vercel.mjs` | Build script injects API URL |
| `package.json` | Added `build:vercel` script |

---

## How It Works

### API Base URL Injection
At build time, `build-vercel.mjs` injects into `index.html`:
```html
<script>window.__SHIFTTRACK_API_BASE__ = "https://your-backend.onrender.com/api";</script>
```

### App.js Configuration
```javascript
const API_BASE = (typeof window !== 'undefined' && window.__SHIFTTRACK_API_BASE__) 
    ? window.__SHIFTTRACK_API_BASE__ 
    : '/api';  // Falls back to same-origin for local dev
```

### Local Development
No changes needed - works with local backend on `http://localhost:3000/api`

---

## Environment Variables (Vercel Dashboard)

| Variable | Required | Value |
|----------|----------|-------|
| `VERCEL_API_BASE` | ✅ Yes | `https://your-backend-domain.com/api` |

---

## CORS Configuration (Backend)

Your backend `server.js` already has `cors()` enabled which allows all origins. For production, you may want to restrict:

```javascript
// In server.js - restrict to your Vercel domain
app.use(cors({
  origin: [
    'https://your-app.vercel.app',
    'https://your-custom-domain.com',
    'http://localhost:3000'  // Local dev
  ],
  credentials: true
}));
```

---

## Custom Domain Setup

### Vercel (Frontend)
1. Vercel Dashboard → Project → Settings → Domains
2. Add your domain: `shiftrack.yourcompany.com`
3. Vercel provides DNS records to add

### Backend (Render/Railway)
1. Add custom domain: `api.yourcompany.com`
2. Update `VERCEL_API_BASE` to `https://api.yourcompany.com/api`

---

## Build Process Details

```
npm run build:vercel
    │
    ├── Reads VERCEL_API_BASE from environment
    ├── Reads index.html
    ├── Injects <script>window.__SHIFTTRACK_API_BASE__ = "..."</script>
    └── Writes modified index.html
```

### Verify Build Output
```bash
# Local test
VERCEL_API_BASE=https://api.example.com/api npm run build:vercel
# Check index.html for injected script
grep "__SHIFTTRACK_API_BASE__" index.html
```

---

## Troubleshooting

### "API_BASE not defined" / CORS Errors
1. Check Vercel build logs for injection success
2. Verify `VERCEL_API_BASE` env var in Vercel dashboard
3. Ensure backend CORS allows your Vercel domain

### "Failed to fetch" / Network Errors
1. Backend must be HTTPS (Vercel blocks mixed content)
2. Check backend `/api/health` endpoint responds
3. Verify `VERCEL_API_BASE` ends with `/api`

### Build Fails
```bash
# Common fixes
npm install          # Ensure dependencies
node --check app.js  # Syntax check
npx html-validate index.html  # HTML validation
```

### SheetJS (XLSX) Not Loading
- XLSX loaded via CDN in index.html (defer)
- Works on Vercel Edge Network
- If issues: add to `public/` and reference locally

---

## Vercel-Specific Optimizations

### Edge Caching (vercel.json)
```json
{
  "headers": [
    {
      "source": "/app.js",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/styles.css",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

### SPA Routing
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## Complete Deployment Checklist

- [ ] Backend deployed and accessible (test `/api/health`)
- [ ] MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- [ ] Backend CORS allows Vercel domain
- [ ] GitHub repo pushed with all config files
- [ ] Vercel project created and connected
- [ ] `VERCEL_API_BASE` environment variable set
- [ ] Build succeeds on Vercel
- [ ] Frontend loads and connects to backend
- [ ] Can add tokens, export Excel/CSV
- [ ] Custom domains configured (optional)

---

## Cost Breakdown

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| **Vercel (Frontend)** | Hobby | **Free** |
| **Render (Backend)** | Free | **Free** (750 hrs) |
| **MongoDB Atlas** | M0 | **Free** (512 MB) |
| **Total** | | **$0/month** |

---

## Alternative: Full-Stack on Vercel

If you want everything on Vercel (serverless functions):

1. Convert `server.js` to `/api/*.js` serverless functions
2. Use `@vercel/node` runtime
3. Remove Express, use native `Request/Response`
4. See Vercel docs for MongoDB connection pooling

*Current approach (separate frontend/backend) is recommended for this Express app.*