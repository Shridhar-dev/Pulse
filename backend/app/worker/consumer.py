import asyncio
import httpx
import logging
from redis.asyncio import Redis
from bullmq import Worker, Job as BullJob
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.db.models import Job as DBJob, JobStatus, AuditTrail
from app.worker.queue import get_redis_options
from app.core.config import settings
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Basic Circuit Breaker State (In-memory)
circuit_failures = 0
circuit_open_until = 0

async def process_job(job: BullJob, redis_conn: Redis):
    global circuit_failures, circuit_open_until
    job_id = job.data.get("job_id")
    logger.info(f"==> Received Job {job_id} from BullMQ")
    payload = job.data.get("payload", {})
    target_url = payload.get("webhook_url", settings.DEFAULT_WEBHOOK_URL) 
    
    # 1. Distributed Lock via Redis (Lock key: pulse_lock:{job_id})
    lock_key = f"pulse_lock:{job_id}"
    lock_acquired = await redis_conn.set(lock_key, "locked", nx=True, ex=settings.DISTRIBUTED_LOCK_TIMEOUT_SECONDS)
    if not lock_acquired:
         logger.warning(f"Failed to acquire lock for job {job_id}")
         raise Exception("Locked by another worker")
         
    try:
        async with AsyncSessionLocal() as session:
            # 2. Verify Postgres status is QUEUED
            query = select(DBJob).where(DBJob.id == job_id)
            result = await session.execute(query)
            db_job = result.scalars().first()
            
            if not db_job or db_job.status != JobStatus.QUEUED:
                logger.info(f"Job {job_id} is not in QUEUED state. Actual: {db_job.status if db_job else 'Missing'}")
                return # Skip execution, already processed
            
            # 3. Clock Skew Mitigation via Redis Time
            redis_time = await redis_conn.time() # Returns (seconds, microseconds)
            redis_timestamp = float(f"{redis_time[0]}.{redis_time[1]}")
            local_timestamp = time.time()
            drift = abs(redis_timestamp - local_timestamp)
            if drift > 0.5:
                logger.debug(f"Clock drift detected: {drift}s")
            
            # Circuit Breaker check
            if time.time() < circuit_open_until:
                raise Exception("Circuit is OPEN. Failing fast.")
            
            # 4. Outbound HTTP with Exponential Backoff
            max_retries = settings.MAX_RETRIES
            success = False
            error_msg = ""
            
            async with httpx.AsyncClient() as client:
                for attempt in range(1, max_retries + 1):
                    try:
                        resp = await client.post(target_url, json=payload, timeout=5.0)
                        resp.raise_for_status()
                        success = True
                        circuit_failures = 0 # reset
                        break
                    except Exception as e:
                        error_msg = str(e)
                        logger.warning(f"HTTP call failed (Attempt {attempt}): {error_msg}")
                        if attempt < max_retries:
                            backoff = 2 ** attempt
                            await asyncio.sleep(backoff)
                        
            # Update status
            previous_state = db_job.status
            db_job.retries += 1
            
            if success:
                db_job.status = JobStatus.EXECUTED
            else:
                db_job.status = JobStatus.FAILED
                circuit_failures += 1
                if circuit_failures >= settings.CIRCUIT_BREAKER_THRESHOLD: # Threshold to open circuit
                    circuit_open_until = time.time() + settings.CIRCUIT_BREAKER_TIMEOUT_SECONDS # open for configured seconds
                    logger.critical("Circuit Breaker OPENED")
            
            # Audit Trail
            audit = AuditTrail(
                job_id=db_job.id,
                previous_state=previous_state,
                new_state=db_job.status,
                details={"error": error_msg} if not success else {"status": "success"}
            )
            session.add(audit)
            await session.commit()
            
            if not success:
                raise Exception(f"Job Failed after retries: {error_msg}")
                
    finally:
        # Release lock
        await redis_conn.delete(lock_key)

async def run_worker():
    redis_opts = get_redis_options()
    redis_conn = Redis(host=redis_opts["host"], port=redis_opts.get("port", 6379), db=redis_opts["db"])
    
    logger.info("Starting BullMQ Worker")
    
    # Proper async closure for the handler
    async def worker_handler(job, token):
        return await process_job(job, redis_conn)

    worker = Worker(
        settings.QUEUE_NAME,
        worker_handler,
        {"connection": redis_opts}
    )
    
    try:
        # Wait indefinitely
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        logger.info("Shutting down worker...")
    finally:
        await worker.close()
        await redis_conn.aclose()
        logger.info("Worker and Redis connection closed.")

if __name__ == "__main__":
    asyncio.run(run_worker())
