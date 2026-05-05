import pandas as pd
import json
from datetime import datetime

def serialize(obj):
    if isinstance(obj, (datetime, pd.Timestamp)):
        return obj.isoformat()
    return str(obj)

def get_full_info(file_path):
    try:
        xl = pd.ExcelFile(file_path)
        sheet_names = xl.sheet_names
        info = {"sheets": sheet_names, "data": {}}
        for sheet in sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet, nrows=15)
            # Convert all data to serializable format
            info["data"][sheet] = [[serialize(cell) if pd.notnull(cell) else None for cell in row] for row in df.values.tolist()]
        return info
    except Exception as e:
        return str(e)

files = [
    "PLANTILLAS IVA F-07v11.7.4.xlsm",
    "ANEXO.RENTA.F14v9.0.xlsm"
]

results = {}
for f in files:
    results[f] = get_full_info(f"c:/Desarrollo_Aplicaciones/ContabilidadArturo/{f}")

print(json.dumps(results, indent=2))
