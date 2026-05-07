from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    sql_query: Optional[str] = None
    results: Optional[List[Dict[str, Any]]] = None
    status: str = "success"
