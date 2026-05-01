import pandas as pd
xl = pd.ExcelFile("PLANTILLAS IVA F-07v11.7.4.xlsm")
print(xl.sheet_names)
