from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from app.config.database import get_database
from app.config.redis_config import get_redis_client
from app.routes import data, analytics
from app.middleware.trust_kong import trust_kong_middleware
from app.services.grpc_client import GRPCClient

load_dotenv()

# Initialize gRPC client
grpc_client = GRPCClient()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to business service via gRPC
    grpc_client.connect()
    yield
    # Close gRPC connection
    grpc_client.close()

app = FastAPI(
    title="Campus Analytics Service",
    description="Analytics and data processing service for campus management",
    version="1.0.0",
    lifespan=lifespan
)

# Trust Kong middleware - no authentication needed
app.middleware("http")(trust_kong_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "campus-analytics"
    }

app.include_router(data.router, prefix="/api/data", tags=["data"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)