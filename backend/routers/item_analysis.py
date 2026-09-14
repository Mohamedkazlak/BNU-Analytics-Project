from fastapi import APIRouter, Depends
from schemas.item_analysis import ItemAnalysisReport
from schemas.auth import UserContext
from core.dependencies import require_role
from db.pool import get_db_conn
import asyncpg
from services.item_analysis import get_item_analysis

router = APIRouter(prefix="/api/item-analysis", tags=["item_analysis"])

@router.get("", response_model=ItemAnalysisReport)
async def route_get_item_analysis(
    ctx: UserContext = Depends(require_role("program_director", "professor")),
    db: asyncpg.Connection = Depends(get_db_conn)
):
    return await get_item_analysis(ctx, db)
