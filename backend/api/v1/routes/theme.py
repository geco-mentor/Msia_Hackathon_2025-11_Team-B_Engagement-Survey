from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import pandas as pd
import uuid
from dynamo.fetch import fetch_all_items
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
router = APIRouter(
    prefix="/themes",
    tags=["Theme Analysis"]
)

def calculate_impact_score(frequency: int, total_count: int, sentiment_score: float) -> int:
    """
    Calculate impact score (0-100) based on frequency and sentiment.
    Higher frequency = higher impact.
    Lower sentiment (negative) might imply higher 'urgency' impact, or we can just use volume.
    Let's use a volume-based impact score normalized by total count.
    """
    if total_count == 0:
        return 0
    
    # Normalized frequency (0-1)
    freq_ratio = frequency / total_count
    
    # Simple heuristic: Impact is primarily driven by how common the theme is.
    # Scaled to 0-100.
    return int(freq_ratio * 100)

def get_trend(current_freq: int, prev_freq: int) -> str:
    """
    Determine trend direction based on percentage change.
    Up: Improvement > 2%
    Down: Decline > 2%
    Stable: Change between -2% and +2%
    """
    if prev_freq == 0:
        # If there was no previous data, consider it "up" if current exists
        return "up" if current_freq > 0 else "stable"
    
    # Calculate percentage change
    percentage_change = ((current_freq - prev_freq) / prev_freq) * 100
    
    if percentage_change > 2:
        return "up"
    elif percentage_change < -2:
        return "down"
    else:
        return "stable"

@router.get("/")
def get_theme_analysis(
    dateRange: str = Query(..., description="week | month | quarter | year"),
    sentiment: Optional[str] = Query(None, description="positive | negative | neutral"),
    limit: int = Query(20, description="Limit results")
):
    try:
        # 1. Fetch Data
        raw_data = fetch_all_items("Feedbacks")
        df = pd.DataFrame(raw_data)
        
        if df.empty:
            return {"success": True, "data": []}
            
        # 2. Pre-process Dates
        # Ensure submission_date is datetime
        df['submission_date'] = pd.to_datetime(df['submission_date'])
        
        # 3. Determine Date Filter Range
        today = datetime.now()
        start_date = today
        
        if dateRange.lower() == 'week':
            start_date = today - timedelta(days=7)
        elif dateRange.lower() == 'month':
            start_date = today - timedelta(days=30)
        elif dateRange.lower() == 'quarter':
            start_date = today - timedelta(days=90)
        elif dateRange.lower() == 'year':
            start_date = today - timedelta(days=365)
        
        # 4. Filter by Date
        current_mask = (df['submission_date'] >= start_date)
        df_filtered = df[current_mask].copy()
        
        # 5. Filter by Sentiment (if provided)
        if sentiment:
            df_filtered = df_filtered[df_filtered['sentiment_label'].astype(str).str.lower() == sentiment.lower()]

        if df_filtered.empty:
            return {"success": True, "data": []}
            
        # 6. Trend Analysis (Previous Period Data)
        # We need previous period data to calculate 'trend'. 
        # Prev period uses same duration, shifted back.
        duration_days = (today - start_date).days
        prev_start = start_date - timedelta(days=duration_days)
        prev_end = start_date
        
        prev_mask = (df['submission_date'] >= prev_start) & (df['submission_date'] < prev_end)
        df_prev = df[prev_mask].copy()
        if sentiment:
            df_prev = df_prev[df_prev['sentiment_label'].astype(str).str.lower() == sentiment.lower()]
            
        prev_counts = df_prev['category'].value_counts().to_dict()

        # 7. Aggregation
        total_filtered_count = len(df_filtered)
        
        themes_data = []
        
        # Group by category
        grouped = df_filtered.groupby('category')
        
        for category, group in grouped:
            if not category or category == "":
                continue
                
            freq = len(group)
            
            # Dominant Sentiment
            sentiment_counts = group['sentiment_label'].value_counts()
            dominant_sentiment = sentiment_counts.idxmax() if not sentiment_counts.empty else "neutral"
            
            # Trend
            prev_freq = prev_counts.get(category, 0)
            trend_dir = get_trend(freq, prev_freq)
            
            # Impact Score
            # Use sentiment score average if available for weighting? 
            # For now, simplistic volume-based impact.
            impact = calculate_impact_score(freq, total_filtered_count, 0)
            
            # Last Detected
            last_detected = group['submission_date'].max().isoformat()
            
            themes_data.append({
                "id": str(uuid.uuid4()), # Generate a view-id for this aggregate row
                "theme": category,
                "sentiment": dominant_sentiment,
                "frequency": freq,
                "trend": trend_dir,
                "impactScore": impact,
                "lastDetected": last_detected
            })
            
        # 8. Sort and Limit
        # Sort by frequency desc
        themes_data.sort(key=lambda x: x['frequency'], reverse=True)
        
        return {
            "success": True, 
            "data": themes_data[:limit]
        }

    except Exception as e:
        print(f"Error in theme analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))
