# Guía de Lanzamiento (Go-Live) - Contabilidad Arturo

¡Felicidades! La aplicación está lista para ser desplegada. Sigue estos pasos para pasar de Mock a Producción.

## 1. Preparación de Supabase (Base de Datos)
1. Ve a tu proyecto en [Supabase Console](https://app.supabase.com).
2. Abre el **SQL Editor**.
3. Copia y ejecuta el contenido de los archivos en `supabase/migrations/` (si aún no los has ejecutado).
4. Asegúrate de que las políticas de RLS estén activas para proteger los datos de cada `tenant`.

## 2. Configuración del Backend
Recomendamos usar **Render** o un VPS con Docker.

### Variables de Entorno Críticas:
- `MOCK_MODE=False`
- `SUPABASE_SERVICE_ROLE_KEY`: Obtén esto de *Settings -> API*. Es vital para el registro de usuarios.
- `REDIS_URL`: Recomendamos **Upstash** (gratis y serverless) o la instancia de Redis en Docker.
- `CORS_ORIGINS`: Agrégale la URL de tu frontend (ej. `https://mi-contabilidad.vercel.app`).

### Despliegue con Docker:
```bash
# Para probar todo localmente en modo producción
docker-compose up --build
```

## 3. Configuración del Frontend
Recomendamos usar **Vercel**.

### Variables de Entorno:
- `NEXT_PUBLIC_API_URL`: La URL pública de tu backend (ej. `https://api-contabilidad.onrender.com/api/v1`).
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 4. Infraestructura y Seguridad (OWASP & DuckDB)
Hemos implementado protecciones automáticas en el código:
- **DuckDB In-Memory**: El motor analítico procesa los CSVs en memoria (`:memory:`) para evitar persistencia innecesaria en disco y maximizar la velocidad.
- **Validación OWASP**: 
  - Límite de tamaño de archivo (10MB) para evitar ataques DoS.
  - Sanitización de `tenant_id` y detección de inyecciones de fórmulas en CSV.
  - Validación estricta de `Content-Type`.

## 5. Verificación Post-Despliegue
1. Intenta registrar un nuevo usuario (debería crear el registro real en Supabase Auth).
2. Verifica que el correo de confirmación llegue (configúralo en Supabase -> Auth -> Email Templates).
3. Sube un CSV pequeño y verifica que las analíticas se calculen y se guarden en caché (Redis).

---
**Nota de Seguridad:** Nunca compartas tu `SUPABASE_SERVICE_ROLE_KEY`. Si se filtra, cámbiala inmediatamente en el panel de Supabase.
