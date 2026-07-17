import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import init_db
from .routes import auth, documents, chat, admin, learn, recommendation, dashboard, analytics

app = FastAPI(title="ConnectiLearn API", version="1.0.0")

# CORS Setup — allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files for Uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include Routers with /api prefix to match Express exactly
app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(learn.router, prefix="/api")
app.include_router(recommendation.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")

@app.on_event("startup")
async def startup_db_client():
    try:
        await init_db()
        print("FastAPI Database client initialized and indexes created.")
    except Exception as e:
        print(f"WARNING: MongoDB database connection failed during startup: {e}")

@app.get("/")
@app.head("/")
async def root_index():
    return {"status": "healthy", "service": "ConnectiLearn FastAPI Backend"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Smart Learning AI is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
