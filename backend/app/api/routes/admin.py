from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client
from app.services.supabase_client import get_supabase_client
from app.api.dependencies.roles import require_admin
import uuid
from typing import List
from datetime import datetime

router = APIRouter()

class PromoCodeCreate(BaseModel):
    code: str
    days_granted: int = 30

class PromoCodeResponse(BaseModel):
    id: str
    code: str
    days_granted: int
    is_active: bool
    created_at: datetime

@router.post("/promo-codes", response_model=PromoCodeResponse, dependencies=[Depends(require_admin)])
def create_promo_code(
    promo: PromoCodeCreate,
    supabase: Client = Depends(get_supabase_client)
):
    try:
        # Check if code already exists
        existing = supabase.table("promo_codes").select("id").eq("code", promo.code).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="El código ya existe.")

        res = supabase.table("promo_codes").insert({
            "code": promo.code,
            "days_granted": promo.days_granted,
            "is_active": True
        }).execute()

        if not res.data:
            raise HTTPException(status_code=500, detail="Error al crear el código promocional.")
            
        return res.data[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/promo-codes", response_model=List[PromoCodeResponse], dependencies=[Depends(require_admin)])
def list_promo_codes(
    supabase: Client = Depends(get_supabase_client)
):
    try:
        res = supabase.table("promo_codes").select("*").order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.patch("/promo-codes/{code_id}/deactivate", dependencies=[Depends(require_admin)])
def deactivate_promo_code(
    code_id: str,
    supabase: Client = Depends(get_supabase_client)
):
    try:
        res = supabase.table("promo_codes").update({"is_active": False}).eq("id", code_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Código no encontrado.")
        return {"message": "Código desactivado exitosamente."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
