import asyncio
from sqlalchemy import select, update
from app.db.database import AsyncSessionLocal
from app.db.models import Job, JobStatus, AuditTrail
from app.worker.queue import get_queue
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_scheduler():
    queue = await get_queue()
    
    while True:
        try:
            async with AsyncSessionLocal() as session:
                # 1. Fetch pending jobs
                query = select(Job).where(Job.status == JobStatus.PENDING).limit(settings.SCHEDULER_BATCH_SIZE)
                result = await session.execute(query)
                jobs = result.scalars().all()
                
                if not jobs:
                    await asyncio.sleep(settings.SCHEDULER_INTERVAL_MS / 1000.0)
                    continue
                
                for job in jobs:
                    # 2. Push to Redis queue (idempotent due to deduplication via jobId)
                    await queue.add(
                        "pulse_event",
                        data={"job_id": job.id, "payload": job.payload},
                        opts={"jobId": job.id}  # Prevents duplication in BullMQ
                    )
                    
                    # 3. Update status in Postgres
                    job.status = JobStatus.QUEUED
                    
                    # Audit Trail
                    audit = AuditTrail(
                        job_id=job.id,
                        previous_state=JobStatus.PENDING,
                        new_state=JobStatus.QUEUED,
                        details={"scheduler": "bullmq_pushed"}
                    )
                    session.add(audit)
                    
                await session.commit()
                logger.info(f"Scheduled {len(jobs)} jobs to queue.")
                
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
            await asyncio.sleep(1) # Backoff on error

if __name__ == "__main__":
    asyncio.run(run_scheduler())
