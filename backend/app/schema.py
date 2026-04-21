from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class JobCreate(BaseModel):
    idempotency_key: str
    payload: Dict[str, Any]

class JobResponse(BaseModel):
    id: str
    idempotency_key: str
    status: str
    retries: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class MetricsResponse(BaseModel):
    total_ingested: int
    total_executed: int
    total_failed: int
    system_lag_ms: float
