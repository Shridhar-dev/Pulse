from fastapi import FastAPI
from contextlib import asynccontextmanager
import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from app.core.config import settings
from app.db.database import engine
from app.db.models import Base
from app.api.jobs import router as jobs_router
from app.api.metrics import router as metrics_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup DB on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Teardown logic
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

app.include_router(jobs_router, prefix=f"{settings.API_V1_STR}/jobs", tags=["Jobs"])
app.include_router(metrics_router, prefix=f"{settings.API_V1_STR}/metrics", tags=["Metrics"])

@app.get("/")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}
