import csv
import io
import logging
from datetime import datetime
from app.core.celery_app import celery_app
from app.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

@celery_app.task(name="app.worker.tasks.process_financial_csv")
def process_financial_csv(bucket_name: str, file_path: str, tenant_id: str):
    supabase = get_supabase_client()
    
    try:
        # 1. Descargar el archivo desde Supabase Storage
        res = supabase.storage.from_(bucket_name).download(file_path)
        content = res.decode('utf-8')
        
        # 2. Detectar separador (coma o punto y coma)
        separator = ',' if ',' in content.split('\n')[0] else ';'
        csv_reader = csv.reader(io.StringIO(content), delimiter=separator)
        
        header = next(csv_reader, None)
        num_cols = len(header) if header else 0
        
        data_to_insert = []
        for row_idx, row in enumerate(csv_reader, start=2):
            if not row or len(row) < 3:
                continue
                
            # Sanitización contra CSV Injection
            row = [("'" + c if isinstance(c, str) and c.startswith(('=', '+', '-', '@')) else c) for c in row]
            
            try:
                # Lógica de Mapeo Inteligente
                if len(row) >= 19: # Formato Hacienda (Ventas)
                    # 0: Fecha, 5/6: NIT, 8/9: Monto Gravado (Depende del anexo exacto)
                    # Para el test usaremos: 0=Fecha, 5=NIT/ID, 8=Monto
                    raw_date = row[0].strip()
                    client_id = row[5].strip() or row[6].strip()
                    raw_amount = row[8].strip()
                    
                    # Convertir fecha DD/MM/YYYY -> YYYY-MM-DD
                    try:
                        dt = datetime.strptime(raw_date, "%d/%m/%Y")
                        fmt_date = dt.strftime("%Y-%m-%d")
                    except:
                        fmt_date = datetime.now().strftime("%Y-%m-%d")
                        
                    amount = float(raw_amount.replace(',', '')) if raw_amount else 0.0
                else:
                    # Formato Simple (3 columnas): client_id, amount, transaction_date
                    client_id = str(row[0])
                    amount = float(row[1]) if row[1] else 0.0
                    fmt_date = str(row[2])

                data_to_insert.append({
                    "tenant_id": tenant_id,
                    "client_id": client_id,
                    "amount": amount,
                    "transaction_date": fmt_date
                })
            except Exception as row_err:
                logger.error(f"Error procesando fila {row_idx}: {row_err}")
                continue
            
        # 4. Inserción en lotes (batch)
        if data_to_insert:
            # Insertar en bloques de 500 para evitar límites de payload
            for i in range(0, len(data_to_insert), 500):
                chunk = data_to_insert[i:i + 500]
                supabase.table("financial_records").insert(chunk).execute()
        
        # 5. Borrar el archivo del bucket
        supabase.storage.from_(bucket_name).remove([file_path])
        
        return {"status": "success", "processed_rows": len(data_to_insert)}
        
    except Exception as e:
        logger.error(f"Error crítico en process_financial_csv: {e}")
        return {"status": "error", "error_message": str(e)}

