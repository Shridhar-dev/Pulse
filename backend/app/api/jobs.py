from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.db.models import Job, JobStatus, AuditTrail
from app.schema import JobCreate, JobResponse
import json

router = APIRouter()

@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(job_in: JobCreate, db: AsyncSession = Depends(get_db)):
    # Idempotency Check
    query = select(Job).where(Job.idempotency_key == job_in.idempotency_key)
    result = await db.execute(query)
    existing_job = result.scalars().first()
    
    if existing_job:
        return existing_job
        
    # Create new job
    new_job = Job(
        idempotency_key=job_in.idempotency_key,
        payload=job_in.payload,
        status=JobStatus.PENDING
    )
    db.add(new_job)
    await db.flush()  # To get new_job.id if needed, but it's generated via uuid4 default
    
    # Audit trail
    audit = AuditTrail(
        job_id=new_job.id,
        new_state=JobStatus.PENDING,
        details={"event": "job_created", "idempotency_key": job_in.idempotency_key}
    )
    db.add(audit)
    
    try:
        await db.commit()
        await db.refresh(new_job)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to enqueue job due to database error.")
        
    return new_job
