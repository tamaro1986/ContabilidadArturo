from pydantic import BaseModel, EmailStr
from typing import Optional

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    # Si es el primer usuario, se le creará un tenant nuevo con este nombre (rol: contador)
    # Si viene con tenant_id, se asume que es un cliente de ese tenant. 
    # (Para simplificar, haremos que todos los registros públicos creen un contador, 
    # y la creación de clientes requiera estar logueado como contador).
    tenant_name: str 

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    email: str
    role: Optional[str] = None
    tenant_id: Optional[str] = None
