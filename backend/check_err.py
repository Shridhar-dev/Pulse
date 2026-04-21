import asyncio
from redis.asyncio import Redis

async def check():
    r = Redis(host="localhost", port=6379, db=1)
    jobs = await r.zrange("bull:pulse_events_queue:failed", 0, -1)
    print("Failed jobs:", jobs)
    for j in jobs:
        data = await r.hgetall("bull:pulse_events_queue:" + j.decode())
        print(f"Job {j.decode()} error:", data.get(b"failedReason"))
    await r.aclose()

if __name__ == "__main__":
    asyncio.run(check())
