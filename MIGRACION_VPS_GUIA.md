# Guía Completa de Migración a VPS - Contabilidad Arturo

Esta guía describe el procedimiento paso a paso para desplegar la plataforma completa (**Frontend Next.js, API FastAPI, Celery Worker, Redis y PostgreSQL**) en tu propio Servidor Privado Virtual (VPS).

---

## Índice
1. [Requisitos Previos del VPS](#1-requisitos-previos-del-vps)
2. [Aprovisionamiento y Seguridad del Servidor (Ubuntu)](#2-aprovisionamiento-y-seguridad-del-servidor-ubuntu)
3. [Instalación de Docker y Docker Compose](#3-instalación-de-docker-y-docker-compose)
4. [Configuración de Dominio y Registros DNS](#4-configuración-de-dominio-y-registros-dns)
5. [Instalación del Proyecto y Variables de Entorno](#5-instalación-del-proyecto-y-variables-de-entorno)
6. [Migración de la Base de Datos](#6-migración-de-la-base-de-datos)
7. [Despliegue de los Servicios](#7-despliegue-de-los-servicios)
8. [Configuración de Respaldos Automáticos (Cron)](#8-configuración-de-respaldos-automáticos-cron)
9. [Comandos Útiles de Mantenimiento](#9-comandos-útiles-de-mantenimiento)

---

## 1. Requisitos Previos del VPS

* **Sistema Operativo:** Ubuntu 22.04 LTS o 24.04 LTS (x86_64).
* **Hardware recomendado:**
  * CPU: 2 o 4 núcleos.
  * RAM: 4 GB mínimo (8 GB recomendado para analítica DuckDB y compilación Next.js).
  * Almacenamiento: 40 GB+ NVMe SSD.
* **Proveedores recomendados:** Hetzner Cloud (CPX21 / CPX31), DigitalOcean, Linode o Contabo.

---

## 2. Aprovisionamiento y Seguridad del Servidor (Ubuntu)

Conéctate por SSH a tu servidor como `root`:
```bash
ssh root@IP_DE_TU_VPS
```

### Paso 2.1: Actualizar el sistema
```bash
apt update && apt upgrade -y
apt install -y git curl ufw fail2ban htop unzip
```

### Paso 2.2: Configurar Firewall (UFW)
Abre únicamente los puertos indispensables:
```bash
# Permitir SSH (puerto 22)
ufw allow 22/tcp

# Permitir HTTP y HTTPS para Caddy (puertos 80 y 443)
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp

# Activar el firewall
ufw --force enable
ufw status verbose
```

> [!CAUTION]
> Los puertos de PostgreSQL (5432) y Redis (6379) **NO** deben abrirse en el firewall público; los servicios se comunican de forma aislada dentro de la red privada interna de Docker.

---

## 3. Instalación de Docker y Docker Compose

Ejecuta el instalador oficial de Docker Engine:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verificar instalación
docker --version
docker compose version
```

---

## 4. Configuración de Dominio y Registros DNS

En el panel de tu proveedor de dominio (Cloudflare, Namecheap, GoDaddy, etc.), crea los siguientes registros DNS de tipo **A** apuntando a la **IP pública de tu VPS**:

| Tipo | Nombre (Host) | Contenido (Valor) | Propósito |
| :--- | :--- | :--- | :--- |
| **A** | `app` | `IP_DE_TU_VPS` | Frontend Web (Next.js) |
| **A** | `api` | `IP_DE_TU_VPS` | API Backend (FastAPI) |
| **A** | `db` | `IP_DE_TU_VPS` | API de Datos y Supabase |

*(Si usas Cloudflare, mantén el proxy en **DNS Only (gris)** inicialmente para permitir que Let's Encrypt valide el certificado SSL directamente con Caddy).*

---

## 5. Instalación del Proyecto y Variables de Entorno

### Paso 5.1: Clonar el repositorio
```bash
cd /opt
git clone https://github.com/TU_USUARIO/ContabilidadArturo.git contabilidad
cd /opt/contabilidad
```

### Paso 5.2: Generar claves criptográficas seguras
Ejecuta el generador de claves incluido:
```bash
python3 scripts/generate_keys.py
```
Este comando imprimirá en pantalla valores seguros para `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY` y `SERVICE_ROLE_KEY`.

### Paso 5.3: Crear el archivo `.env.production`
Copia la plantilla y edítala:
```bash
cp .env.production.example .env.production
nano .env.production
```
Asegúrate de ajustar:
* `DOMAIN_NAME`, `APP_DOMAIN`, `API_DOMAIN`, `DB_DOMAIN` con tus dominios reales.
* `EMAIL_ACME` con tu correo para avisos de Let's Encrypt.
* Pega las claves generadas en el paso anterior.

---

## 6. Migración de la Base de Datos

Tienes dos opciones según tu situación actual:

### Opción A: Migrar datos existentes desde Supabase Cloud
Si ya tienes información en Supabase Cloud que deseas conservar:
```bash
# 1. En tu máquina local o en el VPS, exporta los datos:
./scripts/migrate_database.sh export-cloud "postgresql://postgres:PASSWORD@db.PROYECTO.supabase.co:5432/postgres"

# 2. Una vez levantado el contenedor de base de datos en el VPS:
./scripts/migrate_database.sh import-vps supabase_cloud_export_XXXXX.sql
```

### Opción B: Iniciar una base de datos nueva desde cero
El archivo `docker-compose.prod.yml` monta automáticamente la carpeta `./supabase/migrations` en el punto de inicialización de PostgreSQL, por lo que **las 19 migraciones se aplican automáticamente** en el primer arranque.

Si necesitas aplicarlas manualmente en cualquier momento:
```bash
./scripts/migrate_database.sh run-migrations
```

---

## 7. Despliegue de los Servicios

Haz que los scripts tengan permisos de ejecución:
```bash
chmod +x scripts/*.sh
```

Ejecuta el script de despliegue automatizado:
```bash
./scripts/deploy.sh
```

El script se encargará de:
1. Validar el entorno de Docker y `.env.production`.
2. Compilar las imágenes optimizadas de Frontend, Backend y Celery Worker.
3. Iniciar todos los servicios (`caddy`, `frontend`, `backend`, `worker`, `redis`, `db`).
4. Caddy solicitará automáticamente los certificados SSL válidos ante Let's Encrypt.

### Comprobación de salud:
```bash
docker compose -f docker-compose.prod.yml ps
```
Deberías ver todos los contenedores con estado `Up (healthy)`.

---

## 8. Configuración de Respaldos Automáticos (Cron)

El proyecto incluye el script `scripts/backup_db.sh` que realiza respaldos completos comprimidos en `.sql.gz` y retiene los últimos 14 días.

Para programarlo automáticamente todos los días a las **02:00 AM**:

1. Abre el editor de tareas programadas del servidor:
   ```bash
   crontab -e
   ```
2. Agrega la siguiente línea al final del archivo:
   ```cron
   0 2 * * * /opt/contabilidad/scripts/backup_db.sh >> /var/log/contabilidad_backup.log 2>&1
   ```
3. Guarda y sal.

---

## 9. Comandos Útiles de Mantenimiento

* **Ver logs en tiempo real:**
  ```bash
  docker compose -f docker-compose.prod.yml logs -f
  ```
* **Ver logs de un servicio específico (ej. backend o caddy):**
  ```bash
  docker compose -f docker-compose.prod.yml logs -f backend
  docker compose -f docker-compose.prod.yml logs -f caddy
  ```
* **Reiniciar un servicio:**
  ```bash
  docker compose -f docker-compose.prod.yml restart backend
  ```
* **Actualizar a la última versión tras hacer cambios en Git:**
  ```bash
  git pull
  ./scripts/deploy.sh
  ```
* **Comprobar uso de memoria y CPU:**
  ```bash
  docker stats
  ```
