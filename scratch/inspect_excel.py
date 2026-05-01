import pandas as pd
import sys

def extract_headers(file_path):
    try:
        # Load the excel file
        xl = pd.ExcelFile(file_path)
        print(f"Hojas encontradas: {xl.sheet_names}")
        
        for sheet in xl.sheet_names:
            print(f"\n--- Hoja: {sheet} ---")
            df = pd.read_excel(xl, sheet_name=sheet, nrows=5) # Just read first 5 rows to find headers
            print(df.columns.tolist())
            print(df.head(2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_headers("PLANTILLAS IVA F-07v11.7.4.xlsm")
