-- 1. Tabla de Registros Financieros (Ventas / Analítica)
CREATE TABLE public.financial_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id VARCHAR(255) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

-- 3. Políticas
-- Contadores pueden hacer todo en los registros financieros de su tenant
CREATE POLICY "Contadors can do all on tenant financial records"
    ON public.financial_records FOR ALL
    USING (
        tenant_id = public.get_current_user_tenant_id() 
        AND public.get_current_user_role() = 'contador'
    );

-- Clientes pueden leer todos los registros financieros de su tenant
-- (Opcional: Si el CSV tiene client_id y queremos restringirlo más, se haría. Aquí, por diseño asume que los clientes pueden ver la métrica de su propia empresa (tenant))
CREATE POLICY "Clientes can select their own tenant financial records"
    ON public.financial_records FOR SELECT
    USING (tenant_id = public.get_current_user_tenant_id());
