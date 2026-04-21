import asyncio
from redis.asyncio import Redis
from app.core.config import settings
from app.worker.queue import get_redis_options

async def check():
    opts = get_redis_options()
    r = Redis(host=opts["host"], port=opts["port"], db=opts["db"])
    q = settings.QUEUE_NAME
    keys = await r.keys(f"bull:{q}:*")
    print("Keys:", keys)
    wait = await r.llen(f"bull:{q}:wait")
    print("Wait length:", wait)
    active = await r.llen(f"bull:{q}:active")
    print("Active length:", active)
    await r.aclose()

if __name__ == "__main__":
    asyncio.run(check())
