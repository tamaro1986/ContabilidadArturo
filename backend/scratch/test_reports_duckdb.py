import csv
import duckdb
from pathlib import Path

def test_duckdb_processing():
    # 1. Definir la ruta del CSV de prueba
    temp_dir = Path("temp_uploads")
    temp_dir.mkdir(exist_ok=True)
    test_csv_path = temp_dir / "test_f07_anexo.csv"

    # Datos de prueba con 20 columnas (c0 a c19)
    # Índices de interés (0-based):
    # index 9 (Columna 10) -> ventas_exentas
    # index 10 (Columna 11) -> ventas_no_sujetas
    # index 11 (Columna 12) -> ventas_gravadas_locales
    # index 12 (Columna 13) -> debito_fiscal
    # index 15 (Columna 16) -> total_ventas
    test_rows = [
        # Fila 1
        ["2026-05-17", "FCF", "A01", "001", "Cliente A", "0614-010100-101-1", "12345-6", 
         "0.0", "0.0", "100.0", "50.0", "200.0", "26.0", "0.0", "0.0", "376.0", "0.0", "0.0", "0.0", "0.0"],
        # Fila 2
        ["2026-05-17", "FCF", "A01", "002", "Cliente B", "0614-020200-102-2", "23456-7", 
         "0.0", "0.0", "0.0", "0.0", "150.0", "19.5", "0.0", "0.0", "169.5", "0.0", "0.0", "0.0", "0.0"],
        # Fila 3
        ["2026-05-17", "FCF", "A01", "003", "Cliente C", "0614-030300-103-3", "34567-8", 
         "0.0", "0.0", "50.0", "25.0", "0.0", "0.0", "0.0", "0.0", "75.0", "0.0", "0.0", "0.0", "0.0"]
    ]

    print("1. Creando archivo CSV de prueba...")
    with open(test_csv_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(test_rows)

    print(f"Archivo CSV creado con éxito en: {test_csv_path}")

    # Expected sums:
    # ventas_exentas: 100.0 + 0.0 + 50.0 = 150.0
    # ventas_no_sujetas: 50.0 + 0.0 + 25.0 = 75.0
    # ventas_gravadas_locales: 200.0 + 150.0 + 0.0 = 350.0
    # debito_fiscal: 26.0 + 19.5 + 0.0 = 45.5
    # total_ventas: 376.0 + 169.5 + 75.0 = 620.5

    con = None
    try:
        print("2. Inicializando conexión DuckDB in-memory...")
        con = duckdb.connect(':memory:')

        print("3. Ejecutando consulta analítica de agregación vectorizada...")
        query = f"""
            SELECT 
                COALESCE(SUM(TRY_CAST(c9 AS DOUBLE)), 0) as total_ventas_exentas,
                COALESCE(SUM(TRY_CAST(c10 AS DOUBLE)), 0) as total_ventas_no_sujetas,
                COALESCE(SUM(TRY_CAST(c11 AS DOUBLE)), 0) as total_ventas_gravadas,
                COALESCE(SUM(TRY_CAST(c12 AS DOUBLE)), 0) as total_debito_fiscal,
                COALESCE(SUM(TRY_CAST(c15 AS DOUBLE)), 0) as total_general
            FROM read_csv_auto('{test_csv_path.as_posix()}', 
                header=false, 
                names=['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14', 'c15', 'c16', 'c17', 'c18', 'c19']
            )
        """
        
        result = con.execute(query).fetchone()
        print(f"Resultados de la base de datos: {result}")

        # Comprobaciones assert
        assert result[0] == 150.0, f"Error en ventas_exentas: se esperaba 150.0, obtenido {result[0]}"
        assert result[1] == 75.0, f"Error en ventas_no_sujetas: se esperaba 75.0, obtenido {result[1]}"
        assert result[2] == 350.0, f"Error en ventas_gravadas_locales: se esperaba 350.0, obtenido {result[2]}"
        assert result[3] == 45.5, f"Error en debito_fiscal: se esperaba 45.5, obtenido {result[3]}"
        assert result[4] == 620.5, f"Error en total_ventas: se esperaba 620.5, obtenido {result[4]}"

        print("¡TODO PASÓ CORRECTAMENTE! Las sumas coinciden perfectamente con los cálculos esperados.")

    finally:
        if con is not None:
            con.close()
            print("Conexión DuckDB cerrada.")
        
        # Eliminar archivo temporal
        if test_csv_path.exists():
            test_csv_path.unlink()
            print("Archivo temporal de prueba eliminado.")

if __name__ == "__main__":
    test_duckdb_processing()
