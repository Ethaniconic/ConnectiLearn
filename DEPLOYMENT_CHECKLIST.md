# ConnectiLearn Deployment Checklist

## Pre-Deployment Checklist

### 1. Environment Variables Setup
- [ ] OPENAI_API_KEY configured (Groq or OpenAI)
- [ ] OPENAI_BASE_URL set (default: https://api.groq.com/openai/v1)
- [ ] MODEL_NAME configured (e.g., llama-3.1-70b-versatile)
- [ ] CORS_ORIGINS updated with your domain

### 2. Frontend Build Test
```powershell
cd frontend
npm install
npm run build
# Check that dist/ folder is created with index.html
```

### 3. Backend Test
```powershell
cd backend
& .\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
# Test: http://localhost:8000/health
# Test: http://localhost:8000/docs
```

### 4. Git Repository
- [ ] Code pushed to GitHub/GitLab
- [ ] .gitignore includes venv/, node_modules/, .env
- [ ] All deployment config files committed

## Vercel Frontend Deployment (Recommended)

### Quick Steps:
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure:
   - Framework: **Vite**
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/dist`
4. Deploy
5. Note your URL: `https://your-app.vercel.app`

### Post-Deployment:
- [ ] Test frontend loads: https://your-app.vercel.app
- [ ] Update backend CORS_ORIGINS with Vercel URL
- [ ] Test API connectivity (will fail until backend deployed)

## Railway Backend Deployment (Recommended)

### Quick Steps:
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your ConnectiLearn repository
4. Add environment variables:
   - `OPENAI_API_KEY`
   - `OPENAI_BASE_URL`
   - `MODEL_NAME`
   - `CORS_ORIGINS` = your Vercel URL
5. Railway auto-detects and deploys!
6. Note your URL: `https://your-app.railway.app`

### Post-Deployment:
- [ ] Test backend: https://your-app.railway.app/health
- [ ] Test API docs: https://your-app.railway.app/docs
- [ ] Update frontend to use Railway backend URL

## Connect Frontend to Backend

### Option 1: Update API URL in Frontend Code
Edit `frontend/src/lib/api.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-app.railway.app/api';
```

### Option 2: Use Vercel Environment Variable
Add to Vercel project settings:
- `VITE_API_URL` = `https://your-app.railway.app`

Then update `frontend/src/lib/api.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';
```

Redeploy frontend!

## Testing After Deployment

### Frontend Tests:
- [ ] Home page loads
- [ ] Navigation works (Home, Chat, Notes, Settings)
- [ ] Theme switcher works
- [ ] No console errors

### Backend Tests:
- [ ] Health endpoint: `/health`
- [ ] API docs: `/docs`
- [ ] CORS allows requests from frontend domain

### Full Stack Tests:
- [ ] Upload a test file (Notes page)
- [ ] Send a chat message (Chat page)
- [ ] View uploaded documents (Notes page)
- [ ] Delete a document (Notes page)

## Troubleshooting

### 404 Error on Vercel
**Fix**: Check `vercel.json` has correct rewrite rules for SPA routing

### CORS Error
**Fix**: Add frontend URL to backend CORS_ORIGINS environment variable

### API Calls Fail
**Fix**: Check frontend is using correct backend URL

### Backend Won't Start
**Fix**: Check Railway/Render logs for error messages

## Alternative Deployment Options

### All-in-One Options:
- **Render** (free tier, both frontend + backend): https://render.com
- **Fly.io** (free tier with persistent storage): https://fly.io
- **Netlify** (frontend) + Railway (backend)
- **Cloudflare Pages** (frontend) + Render (backend)

### If You Need Persistent Storage:
Deploy backend to services with volumes/disks:
- Railway (recommended)
- Fly.io
- DigitalOcean App Platform
- AWS/GCP/Azure

## Estimated Deployment Time
- Vercel Frontend: 5 minutes
- Railway Backend: 5-10 minutes
- Total: ~15 minutes for first deploy

## Support
- Vercel: https://vercel.com/docs
- Railway: https://docs.railway.app
- Render: https://render.com/docs

---
Last updated: November 3, 2025
