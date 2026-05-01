import pandas as pd

def extract_specific_sheets(file_path):
    sheets_to_inspect = ['ANEXO 1', 'ANEXO 2', 'ANEXO 4']
    try:
        xl = pd.ExcelFile(file_path)
        for sheet in xl.sheet_names:
            if any(s in sheet.upper() for s in sheets_to_inspect):
                print(f"\n=== {sheet} ===")
                # Read with no header first to find the real header row (often row 1 or 2 in these templates)
                df = pd.read_excel(xl, sheet_name=sheet, nrows=10)
                print(df.columns.tolist())
                print(df.head(5))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_specific_sheets("PLANTILLAS IVA F-07v11.7.4.xlsm")
