// frontend/src/types/companyTypes.ts
export interface Company {
  id: string;
  razonSocial: string;
  nit: string;           // 14 dígitos, formato: 0614-DDMMAA-XXX-X
  lastProcessedMonth: string; // "Mayo 2024"
  status: CompanyStatus;
  totalRecords: number;
  createdAt: string;
}

export type CompanyStatus = 'active' | 'pending' | 'error';

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
