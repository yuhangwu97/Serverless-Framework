import os
import redis.asyncio as redis
from redis.asyncio import Redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

class RedisClient:
    client: Redis = None

redis_client = RedisClient()

async def connect_to_redis():
    redis_client.client = redis.from_url(REDIS_URL, decode_responses=True)
    print(f"Connected to Redis at {REDIS_URL}")

async def close_redis_connection():
    if redis_client.client:
        await redis_client.client.close()
        print("Disconnected from Redis")

def get_redis_client():
    return redis_client.client