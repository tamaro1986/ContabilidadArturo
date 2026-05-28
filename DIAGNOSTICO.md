# Diagnóstico Integral — ContabilidadArturo

## Estado Pre-Fix (18 Mayo 2026)

| Métrica | Valor | Problema |
|---------|-------|----------|
| `financial_records` | **53 registros** ($342,296.74) | Solo 1 upload persistió datos; los otros 2 crearon historial sin datos |
| `csv_upload_history` | **3 entradas** (idénticas) | Sin dedup — mismo archivo subido 3 veces, todas status=success |
| `companies.total_records` | **NO existía** en BD | Migración original nunca creó la columna. Frontend mostraba `0` siempre |
| `companies.status` | **NO existía** en BD | Frontend mapeaba `c.status \|\| 'active'` (fallback), columna ausente |
| `types-breakdown` | Sin filtro `latest_month` | Sumaba TODOS los registros históricos; anexos solo mostraban último mes → inconsistencia |
| `tax_documents.records_processed` | Siempre `0` | `update_status()` en tasks.py no actualizaba este campo |

---

## Cambios Aplicados

### 1. Migraciones DB (`supabase/migrations/`)

| Archivo | Qué hace |
|---------|----------|
| `20260518000000_add_company_metadata.sql` | `ALTER TABLE companies ADD COLUMN status, total_records, last_processed_month` + backfill desde `financial_records` |
| `20260518000001_add_file_hash_dedup.sql` | `ALTER TABLE csv_upload_history ADD COLUMN file_hash` + unique index `(tenant_id, file_hash)` |

### 2. Backend (`backend/`)

| Archivo | Cambio |
|---------|--------|
| `api/routes/financial_data.py` | SHA-256 del archivo antes del upload → verifica duplicados → 409 Conflict si existe |
| `worker/tasks.py` | Post-insert: actualiza `companies.total_records`, `last_processed_month`, `status`; invalida Redis cache |
| `worker/tasks.py` | `update_status()` ahora también actualiza `tax_documents.records_processed` |
| `api/routes/analytics.py` | `types-breakdown` ahora filtra por `latest_month` (consistente con anexos) |
| `services/cache.py` | Nueva función `invalidate_tenant_cache()` |

### 3. Frontend (`frontend/`)

| Archivo | Cambio |
|---------|--------|
| `src/app/dashboard/page.tsx` | Mapeo `c.total_records` (snake_case DB) → `totalRecords` (camelCase UI); mapea `last_processed_month` |

---

## Estado Post-Fix

| Problema | Antes | Ahora |
|----------|-------|-------|
| Portfolio muestra 0 registros | `c.totalRecords \|\| 0` → siempre 0 | Lee `total_records` real de BD (53) |
| 3 uploads repetidos en historial | Sin protección | Hash SHA-256 → 409 Conflict si ya existe |
| Types breakdown no coincide con anexos | Suma todo el historial | Filtra por `latest_month` |
| `tax_documents` sin contador | `records_processed=0` siempre | Se actualiza con el conteo real |
| Cache stale post-upload | Nunca se limpiaba | `invalidate_tenant_cache()` llama tras éxito |

---

## Pendientes / Future Work

- [ ] **UI para 409 Conflict**: el frontend debe mostrar el mensaje de "archivo ya procesado" en lugar de error genérico
- [ ] **Admin RLS en companies**: falta política para `administrador` (solo `contador` tiene acceso via RLS actualmente)
- [ ] **total_records acumulativo vs snapshot**: actualmente se sobreescribe con cada upload. Si se suben datos de meses diferentes, el contador reflejará solo el último upload. Evaluar si debe ser `SUM` acumulativo.
