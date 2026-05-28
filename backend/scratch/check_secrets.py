import duckdb
con = duckdb.connect(':memory:')
con.execute('INSTALL postgres; LOAD postgres;')
res = con.execute("SELECT * FROM duckdb_secret_types()").fetchall()
for row in res:
    if row[0].lower() == 'postgres':
        print(row)
