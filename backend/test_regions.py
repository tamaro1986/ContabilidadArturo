"""Probar diferentes regiones del pooler de Supabase"""
import psycopg2

project_ref = "hujxihigwjjapiuapefd"
password = "Sofia2020$125"

# Todas las regiones conocidas del pooler de Supabase
regions = [
    "aws-0-us-east-1",
    "aws-0-us-east-2",
    "aws-0-us-west-1",
    "aws-0-us-west-2",
    "aws-0-ap-southeast-1",
    "aws-0-ap-northeast-1",
    "aws-0-eu-west-1",
    "aws-0-eu-west-2",
    "aws-0-eu-central-1",
    "aws-0-sa-east-1",
    "aws-0-ap-south-1",
    "aws-0-ca-central-1",
]

for region in regions:
    host = f"{region}.pooler.supabase.com"
    dsn = f"host={host} port=6543 dbname=postgres user=postgres.{project_ref} password={password} connect_timeout=5"
    try:
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        cur.execute("SELECT current_user, current_database()")
        user, db = cur.fetchone()
        print(f"OK >>> {region} -- User={user}, DB={db}")
        cur.close()
        conn.close()
        break
    except Exception as e:
        msg = str(e).strip().split('\n')[0]
        if "Tenant or user not found" in msg:
            print(f"  X {region}: Tenant not found")
        elif "timeout" in msg.lower() or "timed out" in msg.lower():
            print(f"  - {region}: Timeout (probablemente no es esta region)")
        else:
            print(f"  ? {region}: {msg}")
