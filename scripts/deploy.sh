#!/usr/bin/env bash
# ==============================================================================
# Script de Despliegue Automatizado en VPS - Contabilidad Arturo
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================================================${NC}"
echo -e "${BLUE}     DESPLIEGUE EN PRODUCCIÓN - CONTABILIDAD ARTURO (VPS)          ${NC}"
echo -e "${BLUE}===================================================================${NC}"

# 1. Comprobar que Docker y Docker Compose están instalados
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker no está instalado en este sistema.${NC}"
    echo "Instala Docker siguiendo la guía MIGRACION_VPS_GUIA.md"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}[ERROR] Docker Compose plugin no está disponible.${NC}"
    exit 1
fi

# 2. Comprobar archivo de entorno
if [ ! -f .env.production ]; then
    if [ -f .env ]; then
        echo -e "${YELLOW}[AVISO] .env.production no encontrado, usando .env existente.${NC}"
        ENV_FILE=".env"
    else
        echo -e "${RED}[ERROR] No se encontró el archivo .env.production ni .env.${NC}"
        echo "Copia .env.production.example a .env.production y configura las variables."
        exit 1
    fi
else
    ENV_FILE=".env.production"
fi

echo -e "${GREEN}[OK] Usando archivo de configuración: ${ENV_FILE}${NC}"

# 3. Descargar últimos cambios de Git (opcional si está en repo git)
if [ -d .git ]; then
    echo -e "${YELLOW}--> Actualizando repositorio local desde Git...${NC}"
    git fetch --all --prune
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo -e "    Rama actual: ${CURRENT_BRANCH}"
fi

# 4. Construir y actualizar los contenedores
echo -e "${YELLOW}--> Construyendo y desplegando contenedores con Docker Compose...${NC}"
docker compose --env-file "${ENV_FILE}" -f docker-compose.prod.yml pull || true
docker compose --env-file "${ENV_FILE}" -f docker-compose.prod.yml build --parallel

echo -e "${YELLOW}--> Levantando los servicios en segundo plano...${NC}"
docker compose --env-file "${ENV_FILE}" -f docker-compose.prod.yml up -d --remove-orphans

# 5. Esperar verificación de salud de los servicios
echo -e "${YELLOW}--> Verificando estado y salud de los contenedores...${NC}"
sleep 10
docker compose --env-file "${ENV_FILE}" -f docker-compose.prod.yml ps

echo -e "\n${GREEN}===================================================================${NC}"
echo -e "${GREEN}     ¡DESPLIEGUE FINALIZADO CON ÉXITO!                             ${NC}"
echo -e "${GREEN}===================================================================${NC}"
echo -e "Puedes monitorear los logs en tiempo real con:"
echo -e "  docker compose --env-file ${ENV_FILE} -f docker-compose.prod.yml logs -f"
