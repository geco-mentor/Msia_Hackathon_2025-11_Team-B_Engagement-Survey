from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel

# Import the agent function
from utils.recommendation_agent import generate_micro_actions_with_llama

router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"]
)

@router.get("/ping")
def ping():
    return {"message": "pong"}

class MicroActionsResponse(BaseModel):
    success: bool
    data: List[dict]

@router.get("/actions", response_model=MicroActionsResponse)
async def get_micro_actions(
    departments: Optional[str] = Query(None, description="Department name for specific recommendation"),
    position: Optional[str] = Query(None, description="Get recommendations for specific position"),
    priority: Optional[str] = Query(None, description="high | medium | low"),
    category: Optional[str] = Query(None, description="workload | recognition | communication | leadership | wellbeing"),
    limit: int = Query(10, description="Number of results (default: 10)")
):
    """
    Get AI-generated micro-action recommendations.
    """
    try:
        # Call the agent
        result = generate_micro_actions_with_llama(
            department=departments,
            position=position,
            priority=priority,
            category=category,
            limit=limit
        )

        if not result.get("success", False):
            # If the agent returned an explicit error structure
            raise HTTPException(status_code=500, detail=result.get("error", "Unknown error generating actions"))

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
