#!/usr/bin/env bash
# ==============================================================================
# Script de Migración de Base de Datos - Contabilidad Arturo
# ==============================================================================
set -euo pipefail

function show_help() {
    echo "Uso: $0 [comando] [opciones]"
    echo ""
    echo "Comandos disponibles:"
    echo "  export-cloud  <DATABASE_URL_CLOUD>  Exporta la base de datos de Supabase Cloud a dump.sql"
    echo "  import-vps    <archivo.sql>         Restaura un archivo .sql en el contenedor contabilidad_db del VPS"
    echo "  run-migrations                      Ejecuta todas las migraciones de supabase/migrations en orden"
    echo ""
}

if [ $# -lt 1 ]; then
    show_help
    exit 1
fi

COMMAND="$1"

case "${COMMAND}" in
    export-cloud)
        if [ $# -lt 2 ]; then
            echo "Error: Debes proporcionar la URL de conexión de Supabase Cloud."
            echo "Ejemplo: $0 export-cloud 'postgresql://postgres:pass@db.xxxx.supabase.co:5432/postgres'"
            exit 1
        fi
        CLOUD_URL="$2"
        OUTPUT_FILE="supabase_cloud_export_$(date +%Y%m%d_%H%M%S).sql"
        echo "--> Exportando esquema y datos desde Supabase Cloud a ${OUTPUT_FILE}..."
        pg_dump --clean --if-exists --no-owner --no-privileges -d "${CLOUD_URL}" -f "${OUTPUT_FILE}"
        echo "--> [OK] Exportación exitosa en ${OUTPUT_FILE}"
        ;;

    import-vps)
        if [ $# -lt 2 ]; then
            echo "Error: Debes proporcionar el archivo .sql a importar."
            echo "Ejemplo: $0 import-vps dump.sql"
            exit 1
        fi
        SQL_FILE="$2"
        if [ ! -f "${SQL_FILE}" ]; then
            echo "Error: El archivo ${SQL_FILE} no existe."
            exit 1
        fi
        echo "--> Restaurando ${SQL_FILE} en el contenedor contabilidad_db..."
        docker exec -i contabilidad_db psql -U postgres -d postgres < "${SQL_FILE}"
        echo "--> [OK] Restauración completada."
        ;;

    run-migrations)
        echo "--> Ejecutando migraciones SQL en contabilidad_db..."
        for file in $(ls -1 supabase/migrations/*.sql | sort); do
            echo "    Aplicando: ${file}..."
            docker exec -i contabilidad_db psql -U postgres -d postgres < "${file}"
        done
        echo "--> [OK] Todas las migraciones fueron aplicadas con éxito."
        ;;

    *)
        show_help
        exit 1
        ;;
esac
