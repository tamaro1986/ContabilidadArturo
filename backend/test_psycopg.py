"""Test conexion directa con psycopg2 al pooler de Supabase"""
import os
from dotenv import load_dotenv
load_dotenv()

db_url = os.getenv("DATABASE_URL", "")
print(f"URL: {db_url[:50]}...")

try:
    import psycopg2
    print("Conectando con psycopg2...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT current_database(), current_user, version();")
    db, user, ver = cur.fetchone()
    print(f"  DB: {db}")
    print(f"  User: {user}")
    print(f"  Version: {ver[:60]}...")
    cur.execute("SELECT COUNT(*) FROM financial_records;")
    count = cur.fetchone()[0]
    print(f"  Registros en financial_records: {count}")
    cur.close()
    conn.close()
    print("\n=== PSYCOPG2: CONEXION EXITOSA ===")
except ImportError:
    print("psycopg2 no instalado. Probando con sqlalchemy...")
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT current_database(), current_user"))
            row = result.fetchone()
            print(f"  DB: {row[0]}, User: {row[1]}")
            result = conn.execute(text("SELECT COUNT(*) FROM financial_records"))
            count = result.fetchone()[0]
            print(f"  Registros: {count}")
        print("\n=== SQLALCHEMY: CONEXION EXITOSA ===")
    except Exception as e:
        print(f"X ERROR SQLAlchemy: {type(e).__name__}: {e}")
except Exception as e:
    print(f"X ERROR: {type(e).__name__}: {e}")
