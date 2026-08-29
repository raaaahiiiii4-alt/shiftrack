# ShiftTrack - Deployment Guide

## Quick Deploy Options

### 🚀 Option 1: Render (Recommended - Free Tier)
1. Fork this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New +** → **Web Service**
4. Connect your GitHub repo
5. Settings:
   - **Name**: `shiftrack`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
6. Add Environment Variables:
   - `MONGODB_URI` = Your MongoDB Atlas connection string
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render assigns this automatically)
7. Click **Create Web Service**

### 🚂 Option 2: Railway (Free $5 credit/month)
1. Go to [Railway](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repo
4. Add Environment Variable:
   - `MONGODB_URI` = Your MongoDB Atlas connection string
5. Railway auto-detects Node.js and deploys

### 🪰 Option 3: Fly.io (Free tier with 3 shared-cpu VMs)
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login and deploy
fly auth login
fly launch --name shiftrack --region iad
fly secrets set MONGODB_URI="your-mongodb-uri"
fly deploy
```

### 🐳 Option 4: Docker (Any VPS/Cloud)
```bash
# Build
docker build -t shiftrack .

# Run
docker run -d \
  --name shiftrack \
  -p 3000:3000 \
  -e MONGODB_URI="your-mongodb-uri" \
  -e NODE_ENV=production \
  shiftrack

# Or use docker-compose
docker-compose up -d
```

### ☁️ Option 5: DigitalOcean App Platform
1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Create App → GitHub
3. Select repo, branch: `main`
4. Settings auto-detected from `render.yaml`/`Dockerfile`
5. Add `MONGODB_URI` in Environment Variables
6. Deploy

---

## Local Development with Docker

```bash
# Development (with hot reload)
docker-compose -f docker-compose.dev.yml up

# Production-like
docker-compose up --build
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ Yes | MongoDB Atlas connection string |
| `NODE_ENV` | No | `production` or `development` |
| `PORT` | No | Server port (default: 3000, Render: 10000) |

---

## MongoDB Atlas Setup (Already Done)

Your cluster: `shifttrack-cluster.9hrq4xi.mongodb.net`
Database: `shiftrack`
Collection: `tokens` (auto-created with indexes)

**Network Access**: Add `0.0.0.0/0` (Allow from anywhere) for cloud deployments

---

## CI/CD Pipeline (GitHub Actions)

The `.github/workflows/deploy.yml` handles:
1. **Lint & Test** - Syntax check, HTML validation
2. **Build & Push** - Docker image to GHCR
3. **Deploy** - Auto-deploy to Render/Railway/Fly.io

### Required GitHub Secrets:
| Secret | Platform |
|--------|----------|
| `RENDER_API_KEY` | Render |
| `RENDER_SERVICE_ID` | Render |
| `RAILWAY_TOKEN` | Railway |
| `RAILWAY_SERVICE` | Railway |
| `FLY_API_TOKEN` | Fly.io |

---

## Verification Checklist

After deployment, verify:
- [ ] `https://your-app.onrender.com/api/health` returns `{"status":"ok"}`
- [ ] Frontend loads at `https://your-app.onrender.com`
- [ ] Can add tokens via UI
- [ ] Monthly Excel/CSV export works
- [ ] Mine selector switches data
- [ ] Data persists across refreshes

---

## Troubleshooting

### "Connection refused" / "ECONNREFUSED"
- Check `PORT` env var matches platform (Render: 10000, Fly: 8080, Local: 3000)
- Ensure `server.js` listens on `0.0.0.0` not `localhost`

### MongoDB connection timeout
- Verify IP whitelist in Atlas Network Access
- Check `MONGODB_URI` format: `mongodb+srv://user:pass@cluster/db?retryWrites=true&w=majority`

### Static files not loading
- Ensure `app.use(express.static('.'))` is before routes in `server.js`
- Check file paths: `index.html`, `app.js`, `styles.css` in root

### CORS errors
- `cors()` middleware is enabled in `server.js`
- For custom domains, add to CORS origin if needed

---

## Cost Comparison (Monthly)

| Platform | Free Tier | Paid Starts At |
|----------|-----------|----------------|
| Render | ✅ 750 hrs/mo | $7/mo |
| Railway | $5 credit/mo | $5/mo |
| Fly.io | 3 shared VMs | $1.94/mo |
| DigitalOcean | ❌ | $5/mo |
| VPS (DigitalOcean/AWS) | ❌ | $4-6/mo |

---

## Recommended: Render

Best balance of:
- ✅ True free tier (no credit card)
- ✅ Auto HTTPS
- ✅ Custom domains free
- ✅ GitHub integration
- ✅ Zero-config Node.js
- ✅ Health checks built-in