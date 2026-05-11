// frontend/src/types/companyTypes.ts
export interface Company {
  id: string;
  tenant_id: string;      // Relación con el despacho contable
  user_id: string;        // Usuario que registró la empresa
  name: string;           // Razón Social (Mapeado a 'name' en DB)
  nit: string;            // 14 dígitos, formato: 0614-DDMMAA-XXX-X
  created_at: string;
  updated_at: string;
  
  // Campos auxiliares para la UI (pueden ser nulos si no se han procesado datos)
  lastProcessedMonth?: string; // "Mayo 2024"
  status: CompanyStatus;
  totalRecords: number;
}

export type CompanyStatus = 'active' | 'pending' | 'error';

export interface TaxDocument {
  id: string;
  tenant_id: string;
  company_id: string;
  document_type: AnnexUploadType;
  status: 'pending' | 'processed' | 'error';
  created_at: string;
}

// Tipos de Anexo IVA (Ministerio de Hacienda)
export type AnnexUploadType = 'ventas-contribuyentes' | 'ventas-consumidor' | 'compras';

// Configuración de columnas esperadas por tipo de anexo
export interface AnnexTypeConfig {
  label: string;
  expectedColumns: number;
  description: string;
  form: string;
}

// Resultado de validación del CSV
export interface CsvValidationResult {
  isValid: boolean;
  fileName: string;
  fileSize: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  rowCount?: number;
  detectedType?: string;
}

export interface ValidationError {
  code: string;
  severity: 'critical' | 'structural' | 'row-level';
  message: string;
  line?: number;
  column?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  line?: number;
}
