from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get environment variables
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
port = int(os.getenv("PORT", "8000"))
host = os.getenv("HOST", "0.0.0.0")

app = FastAPI(
    title="Data Analytics API",
    description="API for data analytics using DeepSeek models",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to the Data Analytics API"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/health")
async def root_health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=host, port=port, reload=True) 