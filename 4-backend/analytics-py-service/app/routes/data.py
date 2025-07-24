from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime
from typing import List
import json

from app.config.database import get_database
from app.config.redis_config import get_redis_client
from app.models.data_models import DataEvent, CreateDataEventRequest
from app.middleware.auth import verify_jwt_token, TokenData
from app.tasks.data_processing import process_data_event

router = APIRouter()

@router.post("/events", response_model=dict)
async def create_data_event(
    event_request: CreateDataEventRequest,
    background_tasks: BackgroundTasks,
    db=Depends(get_database),
    redis_client=Depends(get_redis_client),
    current_user: TokenData = Depends(verify_jwt_token)
):
    try:
        event = DataEvent(
            event_type=event_request.event_type,
            event_data=event_request.event_data,
            user_id=current_user.user_id,
            metadata=event_request.metadata
        )
        
        event_dict = event.dict(by_alias=True)
        event_dict["_id"] = str(event_dict["_id"])
        
        result = await db.events.insert_one(event_dict)
        
        background_tasks.add_task(process_data_event, str(result.inserted_id))
        
        if redis_client:
            await redis_client.lpush(
                "data_events_queue",
                json.dumps({
                    "event_id": str(result.inserted_id),
                    "event_type": event_request.event_type,
                    "user_id": current_user.user_id,
                    "timestamp": datetime.utcnow().isoformat()
                })
            )
        
        return {
            "success": True,
            "message": "Event recorded successfully",
            "event_id": str(result.inserted_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record event: {str(e)}")

@router.get("/events", response_model=dict)
async def get_user_events(
    skip: int = 0,
    limit: int = 10,
    event_type: str = None,
    db=Depends(get_database),
    current_user: TokenData = Depends(verify_jwt_token)
):
    try:
        query = {"user_id": current_user.user_id}
        if event_type:
            query["event_type"] = event_type
        
        cursor = db.events.find(query).skip(skip).limit(limit).sort("timestamp", -1)
        events = await cursor.to_list(length=limit)
        
        total = await db.events.count_documents(query)
        
        for event in events:
            event["_id"] = str(event["_id"])
        
        return {
            "success": True,
            "events": events,
            "total": total,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch events: {str(e)}")

@router.get("/events/{event_id}", response_model=dict)
async def get_event(
    event_id: str,
    db=Depends(get_database),
    current_user: TokenData = Depends(verify_jwt_token)
):
    try:
        from bson import ObjectId
        
        event = await db.events.find_one({
            "_id": ObjectId(event_id),
            "user_id": current_user.user_id
        })
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event["_id"] = str(event["_id"])
        
        return {
            "success": True,
            "event": event
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch event: {str(e)}")

@router.delete("/events/{event_id}", response_model=dict)
async def delete_event(
    event_id: str,
    db=Depends(get_database),
    current_user: TokenData = Depends(verify_jwt_token)
):
    try:
        from bson import ObjectId
        
        result = await db.events.delete_one({
            "_id": ObjectId(event_id),
            "user_id": current_user.user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")
        
        return {
            "success": True,
            "message": "Event deleted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete event: {str(e)}")