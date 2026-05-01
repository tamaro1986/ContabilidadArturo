import duckdb

def describe_table():
    con = duckdb.connect("backend/duckdb.db")
    try:
        # List tables first
        tables = con.execute("SHOW TABLES").fetchall()
        print(f"Tablas: {tables}")
        
        # Describe pg.financial_records
        res = con.execute("DESCRIBE financial_records").fetchall()
        for row in res:
            print(row)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        con.close()

if __name__ == "__main__":
    describe_table()
