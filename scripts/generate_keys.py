#!/usr/bin/env python3
"""
Generador de Claves Criptográficas para Self-Hosted Supabase / VPS
Genera JWT_SECRET, ANON_KEY y SERVICE_ROLE_KEY compatibles con Supabase GoTrue y PostgREST.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time


def base64url_encode(payload: bytes) -> str:
    return base64.urlsafe_b64encode(payload).decode("utf-8").rstrip("=")


def create_jwt(payload: dict, secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    encoded_header = base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    encoded_signature = base64url_encode(signature)
    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"


def generate():
    # 1. Generar secreto criptográfico seguro de 48 bytes (64 caracteres base64)
    jwt_secret = secrets.token_urlsafe(48)
    now = int(time.time())
    # Validez por 10 años
    exp = now + (10 * 365 * 24 * 60 * 60)

    # 2. Generar Anon Key
    anon_payload = {
        "role": "anon",
        "iss": "supabase",
        "iat": now,
        "exp": exp,
    }
    anon_key = create_jwt(anon_payload, jwt_secret)

    # 3. Generar Service Role Key
    service_payload = {
        "role": "service_role",
        "iss": "supabase",
        "iat": now,
        "exp": exp,
    }
    service_role_key = create_jwt(service_payload, jwt_secret)

    # 4. Generar contraseña de base de datos
    db_password = secrets.token_urlsafe(24)

    print("=" * 70)
    print("CLAVES GENERADAS PARA TU VPS (.env.production)")
    print("=" * 70)
    print(f"\nPOSTGRES_PASSWORD={db_password}")
    print(f"\nJWT_SECRET={jwt_secret}")
    print(f"\nANON_KEY={anon_key}")
    print(f"\nSERVICE_ROLE_KEY={service_role_key}")
    print("\n" + "=" * 70)
    print("Copia estos valores en tu archivo .env.production en el VPS.")
    print("=" * 70)


if __name__ == "__main__":
    generate()
