import csv
import io
from app.core.celery_app import celery_app
from app.services.supabase_client import get_supabase_client

@celery_app.task
def process_financial_csv(bucket_name: str, file_path: str, tenant_id: str):
    supabase = get_supabase_client()
    
    try:
        # 1. Descargar el archivo desde Supabase Storage
        # Usamos service role o aseguramos que las RLS del storage permitan esto
        res = supabase.storage.from_(bucket_name).download(file_path)
        
        # 2. Leer el CSV
        content = res.decode('utf-8')
        csv_reader = csv.reader(io.StringIO(content))
        header = next(csv_reader, None)
        
        sanitized_rows = []
        for row in csv_reader:
            sanitized_row = []
            for cell in row:
                # 3. Sanitización contra CSV Injection (OWASP)
                if isinstance(cell, str) and cell.startswith(('=', '+', '-', '@')):
                    sanitized_row.append("'" + cell)
                else:
                    sanitized_row.append(cell)
            sanitized_rows.append(sanitized_row)
            
        # 4. Procesar los datos hacia la base de datos PostgreSQL
        # Asumiendo que el CSV tiene formato: client_id, amount, transaction_date
        data_to_insert = []
        for row in sanitized_rows:
            if len(row) >= 3:
                data_to_insert.append({
                    "tenant_id": tenant_id,
                    "client_id": str(row[0]),
                    "amount": float(row[1]) if row[1] else 0.0,
                    "transaction_date": str(row[2])
                })
        
        # Inserción en lotes (batch) si hay datos
        if data_to_insert:
            # En producción se recomienda chunking para arrays muy grandes. Supabase maneja bien arrays medianos.
            supabase.table("financial_records").insert(data_to_insert).execute()
        
        # 5. Borrar el archivo crudo del bucket para ahorrar espacio
        supabase.storage.from_(bucket_name).remove([file_path])
        
        return {"status": "success", "processed_rows": len(data_to_insert)}
        
    except Exception as e:
        # Aquí idealmente actualizaríamos el estado en la base de datos para que el usuario
        # vea que su subida falló.
        return {"status": "error", "error_message": str(e)}
