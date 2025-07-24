from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class DataEvent(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    event_type: str
    event_data: Dict[str, Any]
    user_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None
    processed: bool = False

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class CreateDataEventRequest(BaseModel):
    event_type: str
    event_data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None

class AnalyticsQuery(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    event_types: Optional[list] = None
    aggregation: str = "count"  # count, sum, avg
    group_by: Optional[str] = None

class AnalyticsResult(BaseModel):
    total_events: int
    event_breakdown: Dict[str, int]
    time_series: Optional[Dict[str, Any]] = None
    aggregated_data: Optional[Dict[str, Any]] = None