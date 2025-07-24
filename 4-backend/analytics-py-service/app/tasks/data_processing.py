import asyncio
from datetime import datetime
from app.config.database import get_sync_database
from bson import ObjectId

def process_data_event(event_id: str):
    """
    Background task to process data events
    This can include data enrichment, validation, aggregation, etc.
    """
    try:
        db = get_sync_database()
        
        event = db.events.find_one({"_id": ObjectId(event_id)})
        if not event:
            print(f"Event {event_id} not found")
            return
        
        processed_data = {
            "processed_at": datetime.utcnow(),
            "processing_status": "completed"
        }
        
        if event.get("event_type") == "user_action":
            processed_data["category"] = "user_behavior"
        elif event.get("event_type") == "system_event":
            processed_data["category"] = "system_monitoring"
        else:
            processed_data["category"] = "general"
        
        event_data = event.get("event_data", {})
        if isinstance(event_data, dict) and "value" in event_data:
            try:
                processed_data["numeric_value"] = float(event_data["value"])
            except (ValueError, TypeError):
                pass
        
        db.events.update_one(
            {"_id": ObjectId(event_id)},
            {
                "$set": {
                    "processed": True,
                    "processed_data": processed_data
                }
            }
        )
        
        print(f"Successfully processed event {event_id}")
        
    except Exception as e:
        print(f"Error processing event {event_id}: {str(e)}")
        
        try:
            db = get_sync_database()
            db.events.update_one(
                {"_id": ObjectId(event_id)},
                {
                    "$set": {
                        "processed": False,
                        "processing_error": str(e),
                        "error_timestamp": datetime.utcnow()
                    }
                }
            )
        except Exception as update_error:
            print(f"Failed to update error status for event {event_id}: {str(update_error)}")

async def batch_process_events():
    """
    Periodic task to process events in batches
    This would typically be run by a task scheduler like Celery
    """
    try:
        db = get_sync_database()
        
        unprocessed_events = db.events.find(
            {"processed": False},
            {"_id": 1}
        ).limit(100)
        
        for event in unprocessed_events:
            process_data_event(str(event["_id"]))
            
    except Exception as e:
        print(f"Error in batch processing: {str(e)}")

def cleanup_old_events(days_to_keep: int = 30):
    """
    Cleanup task to remove old events
    """
    try:
        from datetime import timedelta
        
        db = get_sync_database()
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        result = db.events.delete_many({
            "timestamp": {"$lt": cutoff_date}
        })
        
        print(f"Cleaned up {result.deleted_count} old events")
        
    except Exception as e:
        print(f"Error in cleanup task: {str(e)}")