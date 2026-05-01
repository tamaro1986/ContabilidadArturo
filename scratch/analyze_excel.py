import pandas as pd
import sys

def analyze_excel(file_path):
    print(f"Analyzing {file_path}...")
    try:
        # Load the excel file
        xl = pd.ExcelFile(file_path)
        print(f"Sheets: {xl.sheet_names}")
        
        for sheet in xl.sheet_names[:3]: # Look at first 3 sheets
            df = pd.read_excel(file_path, sheet_name=sheet, nrows=5)
            print(f"\nSheet: {sheet}")
            print(f"Columns: {list(df.columns)}")
            print("First few rows:")
            print(df.to_string())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_excel(sys.argv[1])
