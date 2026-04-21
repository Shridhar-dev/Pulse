from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Pulse"
    API_V1_STR: str = "/api/v1"
    
    # PostgreSQL Configuration
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/pulse"
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/1"
    
    # Queue Configuration
    QUEUE_NAME: str = "pulse_events_queue"
    DLQ_NAME: str = "pulse_dead_letters"
    MAX_RETRIES: int = 3
    
    # Scheduler Settings
    SCHEDULER_BATCH_SIZE: int = 100
    SCHEDULER_INTERVAL_MS: int = 500
    
    # Fault Tolerance Settings
    CIRCUIT_BREAKER_THRESHOLD: int = 5
    CIRCUIT_BREAKER_TIMEOUT_SECONDS: int = 60
    DISTRIBUTED_LOCK_TIMEOUT_SECONDS: int = 30
    DEFAULT_WEBHOOK_URL: str = "http://localhost:8000/api/v1/health"
    
    # Load Testing Settings
    LOAD_TEST_CONCURRENCY: int = 60
    LOAD_TEST_TOTAL_TASKS: int = 10000
    
    # Router Settings
    ROUTER_TAG_JOBS: str = "Jobs"
    ROUTER_TAG_METRICS: str = "Metrics"
    
    class Config:
        env_file = ".env"

settings = Settings()
