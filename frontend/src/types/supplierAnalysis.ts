export type SupplierCategory = 'Socio Estratégico' | 'Gasto Recurrente' | 'Eventual';

export interface PurchaseOrder {
    fecha: string;
    concepto: string;
    monto: number;
    estado: 'Pagada' | 'Pendiente' | 'Vencida';
}

export interface SupplierRecord {
    id: string;
    nombre: string;             // Nombre comercial del proveedor
    giro: string;               // Rubro/industria
    categoria: SupplierCategory;// Clasificación del proveedor
    gastoHistorico: number;     // Total acumulado de egresos
    ordenPromedio: number;      // Ticket promedio por orden de compra
    tendenciaAnual: number[];   // 12 meses de actividad (0-100)
    insightIA: string;          // Recomendación de IA en lenguaje de negocios
    historialOrdenes: PurchaseOrder[]; // Historial de órdenes/facturas
}
