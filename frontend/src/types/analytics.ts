export interface TrendData {
    mes: string;
    ventas_actual: number;
    gastos_actual: number;
    ventas_anterior?: number;
    rentabilidad?: number;
}

export interface MonthlyCustomer {
    client_id: string;
    customer_name: string;
    monto_mes: number;
    etiqueta: string;
    color: string;
    narrativa: string;
}

export interface BreakdownData {
    name: string;
    value: number;
    color?: string;
}

export interface EntityData {
    nit_dui: string;
    total_amount: number;
}


export interface CustomerSegmentRecord {
    client_id: string;
    customer_name: string;
    last_purchase: string;
    frequency: number;
    monetary: number;
    segment: string;
    etiqueta: string;
    color: string;
    narrativa: string;
}

export interface SegmentData {
    summary: BreakdownData[];
    data: CustomerSegmentRecord[];
}

export interface TaxLiquidation {
    periodo: string;
    debito_fiscal: number;
    credito_fiscal: number;
    neto: number;
    retencion_1: number;
    anticipo_2: number;
    retencion_13: number;
}

export interface DocumentHealth {
    health_score: number;
    anulado: number;
    extraviado: number;
    invalidado: number;
}

export interface TaxData {
    liquidation: TaxLiquidation;
    topEntities: {
        top_clients: EntityData[];
        top_suppliers: EntityData[];
    };
    health: DocumentHealth;
}

export interface YoYData {
  mes: string;
  ventas_actual: number;
  ventas_anterior: number;
}
export interface AnnexRecord {
    fecha: string;
    tipo_doc?: string;
    clase_doc?: string;
    numero?: string;
    numero_final?: string;
    nit_dui: string;
    nombre: string;
    exento: number;
    gravado: number;
    iva: number;
    total: number;
    afp?: number;
    isss?: number;
    isr?: number;
    transaction_type?: string;
    resolucion?: string;
}

export type AnnexType = '1' | '2' | '4' | '14';
