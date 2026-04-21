import asyncio
import httpx
import uuid
import time
import sys
import os

try:
    from app.core.config import settings
    TOTAL_TASKS = settings.LOAD_TEST_TOTAL_TASKS
    CONCURRENCY_LIMIT = settings.LOAD_TEST_CONCURRENCY
    TARGET_URL = f"http://127.0.0.1:8000{settings.API_V1_STR}/jobs/"
except ImportError:
    TOTAL_TASKS = int(os.getenv("LOAD_TEST_TOTAL_TASKS", 10000))
    CONCURRENCY_LIMIT = int(os.getenv("LOAD_TEST_CONCURRENCY", 60))
    TARGET_URL = os.getenv("LOAD_TEST_TARGET_URL", "http://127.0.0.1:8000/api/v1/jobs/")

async def send_job(client: httpx.AsyncClient, sem: asyncio.Semaphore, i: int):
    async with sem:
        payload = {
            "idempotency_key": f"load-test-job-{uuid.uuid4()}-{i}",
            "payload": {
                "webhook_url": "https://httpbin.org/post",
                "data": f"Load test task #{i}"
            }
        }
        try:
            # Removed 'Connection: close' to allow Keep-Alive socket reuse. This makes it 100x faster!
            response = await client.post(TARGET_URL, json=payload, timeout=30.0)
            if response.status_code == 201:
                print(f"[✅] Task {i} successfully ingested.")
                return True
            else:
                print(f"[❌] Task {i} failed with status {response.status_code}.")
                return False
        except Exception as e:
            print(f"[⚠️] Task {i} connection dropped: {str(e)}")
            return False

async def main():
    print(f"🚀 Initializing Load Test: Sending {TOTAL_TASKS} tasks to Pulse...")
    start_time = time.time()
    
    limits = httpx.Limits(max_connections=CONCURRENCY_LIMIT, max_keepalive_connections=CONCURRENCY_LIMIT)
    sem = asyncio.Semaphore(CONCURRENCY_LIMIT)
    
    async with httpx.AsyncClient(limits=limits) as client:
        tasks = [send_job(client, sem, i) for i in range(TOTAL_TASKS)]
        results = await asyncio.gather(*tasks)
        
    duration = time.time() - start_time
    success_count = sum(results)
    
    print("\n" + "="*40)
    print("📈 LOAD TEST INGESTION RESULTS:")
    print("="*40)
    print(f"Total Sent:       {TOTAL_TASKS}")
    print(f"Successful:       {success_count}")
    print(f"Failed:           {TOTAL_TASKS - success_count}")
    print(f"Time Taken:       {duration:.2f} seconds")
    print(f"Throughput:       {(TOTAL_TASKS / duration):.2f} Requests / Second")
    print("="*40)
    print("\nNext: Run `curl http://127.0.0.1:8000/api/v1/metrics/` to track real-time execution!")

if __name__ == "__main__":
    asyncio.run(main())
