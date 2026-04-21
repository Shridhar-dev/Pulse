from bullmq import Queue
from app.core.config import settings

def get_redis_options():
    # redis://localhost:6379/1 -> parse to get host, port, db
    url = settings.REDIS_URL.replace("redis://", "")
    parts = url.split("/")
    host_port = parts[0].split(":")
    db = int(parts[1]) if len(parts) > 1 else 0
    return {
        "host": host_port[0],
        "port": int(host_port[1]) if len(host_port) > 1 else 6379,
        "db": db
    }

async def get_queue():
    redis_opts = get_redis_options()
    queue = Queue(settings.QUEUE_NAME, {"connection": redis_opts})
    return queue
