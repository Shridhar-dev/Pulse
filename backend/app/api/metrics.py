from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.database import get_db
from app.db.models import Job, JobStatus
from app.schema import MetricsResponse
import time

router = APIRouter()

@router.get("/", response_model=MetricsResponse)
async def get_metrics(db: AsyncSession = Depends(get_db)):
    # Total ingested (all jobs)
    query_total = select(func.count()).select_from(Job)
    total_ingested = await db.scalar(query_total)
    
    # Total executed
    query_exec = select(func.count()).select_from(Job).where(Job.status == JobStatus.EXECUTED)
    total_executed = await db.scalar(query_exec)
    
    # Total failed / DLQ
    query_failed = select(func.count()).select_from(Job).where(Job.status == JobStatus.FAILED)
    total_failed = await db.scalar(query_failed)
    
    # Calculate System lag (average time diff between creation and now for PENDING/QUEUED jobs)
    # Simple estimation for observability
    query_lag = select(Job).where(Job.status.in_([JobStatus.PENDING, JobStatus.QUEUED]))
    result = await db.execute(query_lag)
    lagging_jobs = result.scalars().all()
    
    total_lag = 0
    if lagging_jobs:
        # In a real heavy system we would do this aggregated in DB, pulling simple stats here
        now = time.time()
        for j in lagging_jobs:
            total_lag += (now - j.created_at.timestamp()) * 1000
        system_lag_ms = total_lag / len(lagging_jobs)
    else:
        system_lag_ms = 0.0

    return MetricsResponse(
        total_ingested=total_ingested or 0,
        total_executed=total_executed or 0,
        total_failed=total_failed or 0,
        system_lag_ms=system_lag_ms
    )
