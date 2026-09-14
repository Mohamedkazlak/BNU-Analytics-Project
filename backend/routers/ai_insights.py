from typing import Optional
from fastapi import APIRouter, Depends
import asyncpg

from schemas.auth import UserContext
from schemas.ai_insights import Insight, Prediction, RecommendationSet, ChatRequest, ChatResponse
from core.dependencies import get_current_user
from db.pool import get_db_conn
import services.ai_insights as ai_service
import services.chat as chat_service

router = APIRouter(tags=["ai_insights"])


@router.get("/api/insights", response_model=Optional[Insight])
async def get_insights(
    ctx: UserContext = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_conn),
):
    return await ai_service.get_insight(ctx, db)


@router.get("/api/predictions", response_model=Optional[Prediction])
async def get_predictions(
    ctx: UserContext = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_conn),
):
    return await ai_service.get_prediction(ctx, db)


@router.get("/api/recommendations", response_model=Optional[RecommendationSet])
async def get_recommendations(
    insightId: str = "insight",
    ctx: UserContext = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_conn),
):
    return await ai_service.get_recommendations(ctx, db, insightId)


@router.post("/api/chat", response_model=ChatResponse)
async def post_chat(
    body: ChatRequest,
    ctx: UserContext = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_conn),
):
    # Role comes from the verified JWT (ctx), never from the request body —
    # closes the "role is just a field the client sends" gap.
    return await chat_service.get_chat_answer(ctx, db, body.question)
