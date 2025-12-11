from fastapi import APIRouter, Query, HTTPException
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import pandas as pd
from openai import OpenAI
import json
import re
from dynamo.fetch import fetch_all_items
from utils.risk_engine_helpers import calculate_row_metrics

router = APIRouter(
    prefix="/insights",
    tags=["Insights"]
)

# Initialize Ollama client
client = OpenAI(
    base_url="http://localhost:11434/v1", 
    api_key="ollama"
)

# --- Pydantic Models ---
class KeyObservation(BaseModel):
    title: str
    insight: str

class TopTheme(BaseModel):
    name: str
    impact: int

class InsightData(BaseModel):
    summary: str
    keyObservations: List[KeyObservation]
    criticalTeamsCount: int
    topTheme: TopTheme
    engagementTrend: float
    generatedAt: str

class InsightResponse(BaseModel):
    success: bool
    data: InsightData

# --- Helper Functions (Kept exactly as they were) ---
def get_date_range(date_range: str) -> tuple:
    today = datetime.now()
    if date_range.lower() == 'week':
        start_date = today - timedelta(days=7)
        duration_days = 7
    elif date_range.lower() == 'month':
        start_date = today - timedelta(days=30)
        duration_days = 30
    elif date_range.lower() == 'quarter':
        start_date = today - timedelta(days=90)
        duration_days = 90
    elif date_range.lower() == 'year':
        start_date = today - timedelta(days=365)
        duration_days = 365
    else:
        raise ValueError(f"Invalid date range: {date_range}")
    prev_start = start_date - timedelta(days=duration_days)
    prev_end = start_date
    return start_date, today, prev_start, prev_end

def get_theme_data(date_range: str) -> Dict[str, Any]:
    start_date, end_date, _, _ = get_date_range(date_range)
    raw_feedback = fetch_all_items("Feedbacks")
    df = pd.DataFrame(raw_feedback)
    
    if df.empty:
        return {"themes": [], "top_theme": None, "sentiment_distribution": {}}
    
    df['submission_date'] = pd.to_datetime(df['submission_date'])
    df_current = df[(df['submission_date'] >= start_date) & (df['submission_date'] <= end_date)].copy()
    
    if df_current.empty:
        return {"themes": [], "top_theme": None, "sentiment_distribution": {}}
    
    theme_counts = df_current['category'].value_counts()
    total_count = len(df_current)
    themes = []
    for category, count in theme_counts.items():
        if not category: continue
        impact = int((count / total_count) * 100) if total_count > 0 else 0
        theme_data = df_current[df_current['category'] == category]
        dominant_sentiment = theme_data['sentiment_label'].mode()[0] if 'sentiment_label' in theme_data.columns and not theme_data['sentiment_label'].empty else "neutral"
        themes.append({"name": category, "impact": impact, "sentiment": dominant_sentiment})
    
    themes.sort(key=lambda x: x['impact'], reverse=True)
    return {
        "themes": themes,
        "top_theme": themes[0] if themes else None,
        "sentiment_distribution": df_current['sentiment_label'].value_counts().to_dict() if 'sentiment_label' in df_current.columns else {}
    }

def get_metrics_data(date_range: str) -> Dict[str, Any]:
    start_date, end_date, prev_start, prev_end = get_date_range(date_range)
    raw_survey = fetch_all_items("Survey_Response")
    df = pd.DataFrame(raw_survey)
    
    if df.empty:
        return {"avg_engagement": 0, "engagement_trend": 0, "critical_teams_count": 0, "burnout_alerts": 0, "attrition_risk_count": 0}
    
    df = calculate_row_metrics(df)
    df['submission_date'] = pd.to_datetime(df['submission_date'], errors='coerce')
    
    df_current = df[(df['submission_date'] >= start_date) & (df['submission_date'] <= end_date)].copy()
    df_prev = df[(df['submission_date'] >= prev_start) & (df['submission_date'] < prev_end)].copy()
    
    avg_engagement = df_current['engagement_rate'].mean() if not df_current.empty else 0
    prev_engagement = df_prev['engagement_rate'].mean() if not df_prev.empty else avg_engagement
    
    engagement_trend = ((avg_engagement - prev_engagement) / prev_engagement) * 100 if prev_engagement > 0 else 0
    
    critical_teams_count = 0
    if not df_current.empty and 'department' in df_current.columns:
        dept_engagement = df_current.groupby('department')['engagement_rate'].mean()
        critical_teams_count = (dept_engagement < 55).sum()
        
    return {
        "avg_engagement": float(avg_engagement),
        "engagement_trend": float(engagement_trend),
        "critical_teams_count": int(critical_teams_count),
        "burnout_alerts": (df_current['burnout_rate'] > 50).sum() if 'burnout_rate' in df_current.columns else 0,
        "attrition_risk_count": (df_current['attrition_rate'] > 50).sum() if 'attrition_rate' in df_current.columns else 0
    }

def clean_llm_json(raw_text: str) -> dict:
    if "```" in raw_text:
        raw_text = re.sub(r"^```[a-zA-Z]*\s*", "", raw_text.strip())
        raw_text = re.sub(r"\s*```$", "", raw_text.strip())
    
    start_idx = raw_text.find('{')
    end_idx = raw_text.rfind('}')
    if start_idx != -1 and end_idx != -1:
        raw_text = raw_text[start_idx : end_idx + 1]
        
    raw_text = re.sub(r"[\x00-\x1F\x7F]", "", raw_text)
    raw_text = raw_text.replace(""", '"').replace(""", '"')
    return json.loads(raw_text)

def generate_ai_summary(theme_data: Dict, metrics_data: Dict, date_range: str) -> Dict[str, Any]:
    context = f"""
    **Analysis Period**: {date_range}
    **Metrics**: Engagement {metrics_data['avg_engagement']:.1f}% (Trend {metrics_data['engagement_trend']:+.1f}%), Critical Teams: {metrics_data['critical_teams_count']}
    **Top Themes**: {str(theme_data['themes'][:3])}
    """
    
    prompt = f"""You are an HR analytics AI. Analyze this data and return JSON only:
    {context}
    Format: {{ "summary": "...", "keyObservations": [{{ "title": "...", "insight": "..." }}] }}
    """
    
    try:
        response = client.chat.completions.create(
            model="llama3.2", messages=[{"role": "user", "content": prompt}], temperature=0.7
        )
        return clean_llm_json(response.choices[0].message.content.strip())
    except Exception as e:
        print(f"AI Error: {e}")
        return {"summary": "Data processed.", "keyObservations": []}

# --- ENDPOINTS ---

@router.get("/", response_model=InsightResponse)
@cache(expire=3600)  # Cache for 1 hour
async def get_insights(
    dateRange: str = Query(..., description="week | month | quarter | year")
):
    """
    Get insights. 
    NOTE: This function is only executed if the cache is empty (MISS).
    If cached (HIT), this whole block is skipped and data is returned instantly.
    """
    print(f"DEBUG: Cache MISS for {dateRange} - Running calculation...")
    
    # 1. Validation
    valid_ranges = ['week', 'month', 'quarter', 'year']
    if dateRange.lower() not in valid_ranges:
        raise HTTPException(status_code=400, detail="Invalid dateRange")
    
    try:
        # 2. Fetch & Process Data
        theme_data = get_theme_data(dateRange)
        metrics_data = get_metrics_data(dateRange)
        
        # 3. Generate AI Insights
        ai_summary = generate_ai_summary(theme_data, metrics_data, dateRange)
        
        # 4. Format Response
        return {
            "success": True,
            "data": {
                "summary": ai_summary.get("summary", "Summary unavailable"),
                "keyObservations": ai_summary.get("keyObservations", []),
                "criticalTeamsCount": metrics_data['critical_teams_count'],
                "topTheme": theme_data['top_theme'] or {"name": "None", "impact": 0},
                "engagementTrend": round(metrics_data['engagement_trend'], 2),
                "generatedAt": datetime.now().isoformat()
            }
        }
    except Exception as e:
        print(f"Error generating insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cache")
async def clear_cache():
    """
    Clear ALL cached insights.
    With in-memory cache, we usually just clear everything as it's cheap to rebuild.
    """
    await FastAPICache.clear()
    return {"success": True, "message": "All insights cache cleared"}