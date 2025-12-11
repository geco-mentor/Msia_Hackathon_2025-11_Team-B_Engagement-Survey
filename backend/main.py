from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from api.v1.routes.upload import router as upload_router
from api.v1.routes.recommendations import router as recommendations_router
from api.v1.routes.metrics import router as metrics_router
from api.v1.routes.actions_log import router as interventions_router
from api.v1.routes.departments import router as departments_router
from api.v1.routes.team import router as team_router
from api.v1.routes.trends import router as trends_router
from api.v1.routes.feedback import router as feedback_router
from api.v1.routes.filters import router as filters_router
from api.v1.routes.websocket_alerts import router as websocket_router
from api.v1.routes.insight import router as insight_router
from api.v1.routes.employees import router as employees_router
from api.v1.routes.theme import router as theme_router

from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from contextlib import asynccontextmanager
import uvicorn
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP: Initialize the cache
    print("🚀 Starting up... Initializing In-Memory Cache")
    FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")
    yield
    # SHUTDOWN: (Optional cleanup)
    print("🛑 Shutting down...")

app = FastAPI(
    lifespan=lifespan,
    title="AI Hackathon - Employee Wellbeing API",
    description="API for analyzing employee surveys and generating AI-powered recommendations",
    version="1.0.0"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/api/v1")
app.include_router(recommendations_router, prefix="/api/v1")
app.include_router(metrics_router, prefix="/api/v1")
app.include_router(interventions_router, prefix="/api/v1")
app.include_router(departments_router, prefix="/api/v1")
app.include_router(team_router, prefix="/api/v1")
app.include_router(trends_router, prefix="/api/v1")
app.include_router(feedback_router, prefix="/api/v1")
app.include_router(filters_router, prefix="/api/v1")
app.include_router(websocket_router, prefix="/api/v1")
app.include_router(insight_router, prefix="/api/v1")
app.include_router(employees_router, prefix="/api/v1")
app.include_router(theme_router, prefix="/api/v1")



@app.get("/")
async def root():
    return {
        "message": "Employee Wellbeing API",
        "version": "1.0.0",
        "endpoints": {
            "upload": "/api/v1/upload",
            "recommendations": "/api/v1/recommendations",
            "metrics": "/api/v1/metrics",
            "interventions": "/api/v1/interventions",
            "departments": "/api/v1/departments",
            "team": "/api/v1/team",
            "trends": "/api/v1/trends",
            "filters": "/api/v1/filters",
            "insights": "/api/v1/insights",
            "websocket_alerts": "ws://localhost:8000/api/v1/ws/alerts",
            "employees": "/api/v1/employees",
            "themes": "/api/v1/themes",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
