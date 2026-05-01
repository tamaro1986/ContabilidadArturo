import pandas as pd

def extract_specific_sheets(file_path):
    sheets = ['ANEXO CONTRIBUYENTES', 'ANEXO CONSUMIDOR FINAL', 'ANEXO DE COMPRAS']
    xl = pd.ExcelFile(file_path)
    for sheet in sheets:
        print(f"\n=== {sheet} ===")
        df = pd.read_excel(xl, sheet_name=sheet, header=None, nrows=5)
        # Try to find which row is the header (usually has text like 'FECHA', 'NIT', etc)
        for i, row in df.iterrows():
            print(f"Fila {i}: {row.tolist()}")

if __name__ == "__main__":
    extract_specific_sheets("PLANTILLAS IVA F-07v11.7.4.xlsm")
