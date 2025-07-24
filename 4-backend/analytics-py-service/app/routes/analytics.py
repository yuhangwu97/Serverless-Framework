from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
from typing import Dict, Any
import asyncio

from app.config.database import get_database
from app.models.data_models import AnalyticsQuery, AnalyticsResult
from app.middleware.auth import verify_jwt_token, TokenData

router = APIRouter()

@router.get("/dashboard", response_model=dict)
async def get_analytics_dashboard(
    db=Depends(get_database),
    current_user: TokenData = Depends(verify_jwt_token)
):
    try:
        user_query = {"user_id": current_user.user_id}
        
        total_events = await db.events.count_documents(user_query)
        
        event_types_pipeline = [
            {"$match": user_query},
            {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        event_types_cursor = db.events.aggregate(event_types_pipeline)
        event_types = await event_types_cursor.to_list(length=None)
        
        event_breakdown = {item["_id"]: item["count"] for item in event_types}
        
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)
        
        daily_pipeline = [
            {"$match": {
                "user_id": current_user.user_id,
                "timestamp": {"$gte": week_ago}
            }},
            {"$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$timestamp"
                    }
                },
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        daily_cursor = db.events.aggregate(daily_pipeline)
        daily_stats = await daily_cursor.to_list(length=None)
        
        time_series = {item["_id"]: item["count"] for item in daily_stats}
        
        recent_events = await db.events.find(
            user_query,
            {"event_type": 1, "timestamp": 1, "event_data": 1}
        ).sort("timestamp", -1).limit(10).to_list(length=10)
        
        for event in recent_events:
            event["_id"] = str(event["_id"])
        
        return {
            "success": True,
            "data": {
                "total_events": total_events,
                "event_breakdown": event_breakdown,
                "time_series": time_series,
                "recent_events": recent_events
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics: {str(e)}")

@router.post("/query", response_model=dict)
async def query_analytics(
    query: AnalyticsQuery,
    db=Depends(get_database),
    current_user: TokenData = Depends(verify_jwt_token)
):
    try:
        match_criteria = {"user_id": current_user.user_id}
        
        if query.start_date or query.end_date:
            timestamp_filter = {}
            if query.start_date:
                timestamp_filter["$gte"] = query.start_date
            if query.end_date:
                timestamp_filter["$lte"] = query.end_date
            match_criteria["timestamp"] = timestamp_filter
        
        if query.event_types:
            match_criteria["event_type"] = {"$in": query.event_types}
        
        pipeline = [{"$match": match_criteria}]
        
        if query.group_by:
            group_stage = {
                "_id": f"${query.group_by}",
                "count": {"$sum": 1}
            }
            
            if query.aggregation == "sum" and "event_data.value" in match_criteria:
                group_stage["total"] = {"$sum": "$event_data.value"}
            elif query.aggregation == "avg" and "event_data.value" in match_criteria:
                group_stage["average"] = {"$avg": "$event_data.value"}
            
            pipeline.append({"$group": group_stage})
            pipeline.append({"$sort": {"count": -1}})
        
        cursor = db.events.aggregate(pipeline)
        results = await cursor.to_list(length=None)
        
        total_events = await db.events.count_documents(match_criteria)
        
        return {
            "success": True,
            "data": {
                "total_events": total_events,
                "results": results,
                "query_params": query.dict()
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute analytics query: {str(e)}")

@router.get("/export", response_model=dict)
async def export_data(
    format: str = "json",
    start_date: str = None,
    end_date: str = None,
    db=Depends(get_database),
    current_user: TokenData = Depends(verify_jwt_token)
):
    try:
        query = {"user_id": current_user.user_id}
        
        if start_date:
            query["timestamp"] = {"$gte": datetime.fromisoformat(start_date)}
        if end_date:
            if "timestamp" not in query:
                query["timestamp"] = {}
            query["timestamp"]["$lte"] = datetime.fromisoformat(end_date)
        
        cursor = db.events.find(query).sort("timestamp", -1)
        events = await cursor.to_list(length=None)
        
        for event in events:
            event["_id"] = str(event["_id"])
            event["timestamp"] = event["timestamp"].isoformat()
        
        if format.lower() == "csv":
            import csv
            import io
            
            output = io.StringIO()
            if events:
                fieldnames = list(events[0].keys())
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                for event in events:
                    writer.writerow(event)
            
            return {
                "success": True,
                "data": output.getvalue(),
                "format": "csv",
                "count": len(events)
            }
        
        return {
            "success": True,
            "data": events,
            "format": "json",
            "count": len(events)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")