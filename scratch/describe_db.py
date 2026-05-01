import duckdb

def describe_table():
    con = duckdb.connect("backend/app/db/pg.duckdb") # Check path
    try:
        res = con.execute("DESCRIBE pg.financial_records").fetchall()
        for row in res:
            print(row)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        con.close()

if __name__ == "__main__":
    describe_table()
