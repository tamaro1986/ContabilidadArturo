-- Configuración de tablas para gestión de empresas y documentos fiscales
-- Aislamiento Multi-tenant implementado vía RLS

-- 1. Tabla Companies (Clientes administrados por el despacho contable)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    nit VARCHAR(20) NOT NULL, -- Formato esperado: 0614-DDMMAA-XXX-X
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla Tax Documents (Registro de cargas de archivos CSV)
CREATE TABLE IF NOT EXISTS public.tax_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'ventas-contribuyentes', 'ventas-consumidor', 'compras'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'error'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_documents ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acceso (Multi-tenancy)

-- Políticas para la tabla 'companies'
CREATE POLICY "Contadors can perform all actions on tenant companies"
    ON public.companies FOR ALL
    TO authenticated
    USING (
        tenant_id = public.get_current_user_tenant_id() 
        AND public.get_current_user_role() = 'contador'
    )
    WITH CHECK (
        tenant_id = public.get_current_user_tenant_id() 
        AND public.get_current_user_role() = 'contador'
    );

-- Políticas para la tabla 'tax_documents'
CREATE POLICY "Contadors can perform all actions on tenant tax documents"
    ON public.tax_documents FOR ALL
    TO authenticated
    USING (
        tenant_id = public.get_current_user_tenant_id() 
        AND public.get_current_user_role() = 'contador'
    )
    WITH CHECK (
        tenant_id = public.get_current_user_tenant_id() 
        AND public.get_current_user_role() = 'contador'
    );

-- 5. Trigger para actualizar automáticamente 'updated_at' en 'companies'
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_companies_updated_at ON public.companies;
CREATE TRIGGER set_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
