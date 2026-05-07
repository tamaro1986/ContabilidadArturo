export type CustomerStatus = 'Campeones' | 'Leales' | 'En Riesgo' | 'zinc';

export interface Invoice {
    fecha: string;
    concepto: string;
    monto: number;
    estado: 'Pagada' | 'Pendiente' | 'Vencida';
}

export interface CustomerRecord {
    id: string;
    nombre: string;
    giro: string;
    estado: CustomerStatus;
    gananciaHistorica: number;
    ticketPromedio: number;
    tendenciaAnual: number[]; // 12 meses de actividad (0-100 para visualización)
    insightIA: string;
    historialFacturas: Invoice[];
}
