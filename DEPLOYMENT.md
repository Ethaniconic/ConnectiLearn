# Deploying ConnectiLearn to Vercel

## Overview
This guide covers deploying the ConnectiLearn fullstack app (React frontend + FastAPI backend) to Vercel.

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- Vercel CLI installed: `npm install -g vercel`
- Git repository (GitHub, GitLab, or Bitbucket)

## Important Notes for Vercel Deployment

### Backend Limitations
⚠️ **FAISS is NOT available on Vercel serverless functions**. The app uses an in-memory fallback when FAISS is unavailable (already implemented in `backend/app/services/rag_service.py`).

⚠️ **Persistent storage is NOT available** on Vercel serverless. File uploads and vector database will be lost between function invocations. For production, consider:
- Using a cloud storage service (AWS S3, Cloudinary, etc.) for file uploads
- Using a cloud vector database (Pinecone, Weaviate, Qdrant, etc.)
- Deploying backend separately to a service with persistent storage (Railway, Render, Fly.io)

## Step-by-Step Deployment

### Option 1: Deploy via Vercel Dashboard (Recommended for First Deploy)

1. **Push your code to GitHub**
   ```powershell
   git add .
   git commit -m "Add Vercel deployment configuration"
   git push origin main
   ```

2. **Import Project to Vercel**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your ConnectiLearn repository
   - Click "Import"

3. **Configure Build Settings**
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave as root)
   - **Build Command**: `cd frontend && npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `cd frontend && npm install`

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   - `OPENAI_API_KEY`: Your OpenAI/Groq API key
   - `OPENAI_BASE_URL`: `https://api.groq.com/openai/v1` (or your provider URL)
   - `MODEL_NAME`: `llama-3.1-70b-versatile` (or your model)
   - `CORS_ORIGINS`: `https://your-app.vercel.app` (update after first deploy)

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (3-5 minutes)
   - Your app will be live at `https://your-app-name.vercel.app`

6. **Update CORS Settings**
   After first deploy, update the `CORS_ORIGINS` environment variable:
   - Go to your project settings → Environment Variables
   - Update `CORS_ORIGINS` to your actual domain
   - Redeploy

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not installed)
   ```powershell
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```powershell
   vercel login
   ```

3. **Build Frontend**
   ```powershell
   cd frontend
   npm run build
   cd ..
   ```

4. **Deploy to Vercel**
   ```powershell
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - What's your project's name? **connectilearn**
   - In which directory is your code located? **.**
   - Want to override settings? **Y**
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/dist`
   - Development Command: Leave empty

5. **Add Environment Variables**
   ```powershell
   vercel env add OPENAI_API_KEY
   # Paste your API key when prompted
   
   vercel env add OPENAI_BASE_URL
   # Enter: https://api.groq.com/openai/v1
   
   vercel env add MODEL_NAME
   # Enter: llama-3.1-70b-versatile
   ```

6. **Deploy to Production**
   ```powershell
   vercel --prod
   ```

## Alternative: Deploy Frontend Only to Vercel

If you encounter issues with the backend on Vercel, deploy **only the frontend** and host the backend elsewhere:

### Deploy Frontend Only

1. **Update vercel.json** (simplified version):
   ```json
   {
     "buildCommand": "cd frontend && npm run build",
     "outputDirectory": "frontend/dist",
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

2. **Update API Base URL**
   Create `frontend/.env.production`:
   ```env
   VITE_API_URL=https://your-backend-url.railway.app
   ```

   Update `frontend/src/lib/api.ts`:
   ```typescript
   const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
   ```

3. **Deploy Backend Separately** to:
   - **Railway**: https://railway.app (easiest, free tier)
   - **Render**: https://render.com (free tier available)
   - **Fly.io**: https://fly.io (free tier with persistent storage)
   - **Heroku**: https://heroku.com (paid)

### Deploy Backend to Railway (Recommended Alternative)

1. **Create `railway.toml`** in project root:
   ```toml
   [build]
   builder = "NIXPACKS"
   buildCommand = "pip install -r backend/requirements.txt"
   
   [deploy]
   startCommand = "cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
   restartPolicyType = "ON_FAILURE"
   restartPolicyMaxRetries = 10
   ```

2. **Deploy to Railway**:
   - Go to https://railway.app
   - Connect your GitHub repo
   - Add environment variables
   - Deploy!

## Troubleshooting

### 404 Error on Deployment

**Cause**: Vercel can't find your built files or routing is incorrect.

**Solutions**:
1. Ensure `frontend/dist` exists and has files
2. Run `npm run build` in frontend directory locally first
3. Check `vercel.json` routes configuration
4. Add `frontend/dist/index.html` fallback for SPA routing

### Backend API Not Working

**Cause**: Python serverless functions have cold starts and size limits.

**Solutions**:
1. Check Vercel function logs: Project → Deployments → [Latest] → Functions
2. Reduce dependencies (sentence-transformers is LARGE - 500MB+)
3. Consider deploying backend separately (Railway, Render, Fly.io)

### CORS Errors

**Cause**: Backend not allowing requests from your Vercel domain.

**Solution**: Update `CORS_ORIGINS` environment variable in Vercel:
```
https://your-app.vercel.app,https://your-app-git-main.vercel.app
```

### File Upload Not Persisting

**Cause**: Vercel serverless functions are stateless.

**Solution**: Use external storage:
- AWS S3 + boto3
- Cloudinary
- Vercel Blob Storage
- Railway with volumes

## Production Recommendations

For a production-ready deployment:

1. **Backend**: Deploy to Railway/Render/Fly.io (persistent storage)
2. **Frontend**: Deploy to Vercel/Netlify/Cloudflare Pages
3. **Database**: Use cloud vector DB (Pinecone, Weaviate, Qdrant)
4. **File Storage**: Use S3/Cloudinary for uploads
5. **Monitoring**: Add error tracking (Sentry)
6. **Analytics**: Add Vercel Analytics

## Quick Deploy Commands

```powershell
# Build frontend
cd frontend
npm run build

# Deploy to Vercel
cd ..
vercel --prod

# Check deployment
vercel ls

# View logs
vercel logs
```

## Additional Resources

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs

---

**Need Help?** Check the Vercel deployment logs or open an issue in the repository.
