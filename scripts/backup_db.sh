#!/usr/bin/env bash
# ==============================================================================
# Script de Respaldo Automatizado de Base de Datos - Contabilidad Arturo
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${HOME}/backups/contabilidad_db"
DATE=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/contabilidad_backup_${DATE}.sql.gz"
RETENTION_DAYS=14

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Iniciando respaldo de base de datos..."

# Ejecutar pg_dump dentro del contenedor y comprimir con gzip
if docker ps --format '{{.Names}}' | grep -q "contabilidad_db"; then
    docker exec contabilidad_db pg_dump -U postgres postgres | gzip > "${FILENAME}"
    FILESIZE=$(du -h "${FILENAME}" | cut -f1)
    echo "[$(date)] Respaldo completado con éxito: ${FILENAME} (${FILESIZE})"
else
    echo "[$(date)] ERROR: El contenedor 'contabilidad_db' no se encuentra en ejecución."
    exit 1
fi

# Eliminar respaldos antiguos según política de retención
echo "[$(date)] Limpiando respaldos con más de ${RETENTION_DAYS} días de antigüedad..."
find "${BACKUP_DIR}" -type f -name "contabilidad_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Proceso de respaldo finalizado."
