import { SupplierRecord } from '../types/supplierAnalysis';

export const supplierMockData: SupplierRecord[] = [
    {
        id: 'S1',
        nombre: 'Importadora El Sol S.A. de C.V.',
        giro: 'Distribución de Materia Prima',
        categoria: 'Socio Estratégico',
        gastoHistorico: 85200.40,
        ordenPromedio: 14200.00,
        tendenciaAnual: [80, 85, 90, 75, 88, 92, 95, 85, 90, 100, 95, 98],
        insightIA: 'Este es su principal proveedor. La relación es sólida, pero el gasto ha subido un 8% este mes. Se recomienda negociar un descuento por volumen.',
        historialOrdenes: [
            { fecha: '2024-05-02', concepto: 'Compra Lote Materia Prima', monto: 15400.00, estado: 'Pendiente' },
            { fecha: '2024-04-05', concepto: 'Compra Lote Materia Prima', monto: 14000.00, estado: 'Pagada' },
            { fecha: '2024-03-10', concepto: 'Insumos de Producción', monto: 13200.00, estado: 'Pagada' },
        ]
    },
    {
        id: 'S2',
        nombre: 'Compañía Eléctrica Nacional',
        giro: 'Servicios Públicos',
        categoria: 'Gasto Recurrente',
        gastoHistorico: 24500.00,
        ordenPromedio: 2050.00,
        tendenciaAnual: [45, 48, 50, 52, 55, 60, 65, 62, 58, 55, 50, 48],
        insightIA: 'Gasto fijo crítico. Se observa un pico estacional en los meses de calor. Evalúe medidas de ahorro energético para reducir el costo operativo.',
        historialOrdenes: [
            { fecha: '2024-05-01', concepto: 'Energía Eléctrica - Mayo', monto: 2150.00, estado: 'Pagada' },
            { fecha: '2024-04-01', concepto: 'Energía Eléctrica - Abril', monto: 2080.00, estado: 'Pagada' },
        ]
    },
    {
        id: 'S3',
        nombre: 'Logística Express y Carga',
        giro: 'Transporte y Distribución',
        categoria: 'Socio Estratégico',
        gastoHistorico: 42100.00,
        ordenPromedio: 3500.00,
        tendenciaAnual: [60, 65, 70, 68, 72, 75, 80, 85, 90, 92, 88, 85],
        insightIA: 'Proveedor clave para la entrega a clientes. Los tiempos de entrega son excelentes, pero el costo de combustible está impactando sus tarifas.',
        historialOrdenes: [
            { fecha: '2024-04-20', concepto: 'Fletes Nacionales Sem. 3', monto: 3800.00, estado: 'Pagada' },
            { fecha: '2024-04-10', concepto: 'Fletes Nacionales Sem. 2', monto: 3600.00, estado: 'Pagada' },
        ]
    },
    {
        id: 'S4',
        nombre: 'Inmuebles Corporativos SV',
        giro: 'Alquiler de Bienes Raíces',
        categoria: 'Gasto Recurrente',
        gastoHistorico: 60000.00,
        ordenPromedio: 5000.00,
        tendenciaAnual: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
        insightIA: 'Costo fijo invariable. Representa el 15% de sus gastos operativos mensuales. El contrato vence en 6 meses, prepárese para la renegociación.',
        historialOrdenes: [
            { fecha: '2024-05-01', concepto: 'Arrendamiento Bodega Sur', monto: 5000.00, estado: 'Pagada' },
            { fecha: '2024-04-01', concepto: 'Arrendamiento Bodega Sur', monto: 5000.00, estado: 'Pagada' },
        ]
    },
    {
        id: 'S5',
        nombre: 'Repuestos Industriales Alfa',
        giro: 'Mantenimiento de Maquinaria',
        categoria: 'Eventual',
        gastoHistorico: 12400.00,
        ordenPromedio: 4100.00,
        tendenciaAnual: [10, 0, 50, 0, 0, 80, 0, 0, 20, 0, 0, 40],
        insightIA: 'Gastos por reparaciones de emergencia. El aumento en la frecuencia indica que sus máquinas podrían necesitar un mantenimiento preventivo mayor.',
        historialOrdenes: [
            { fecha: '2024-03-15', concepto: 'Cambio de Rodamientos Motor 1', monto: 4500.00, estado: 'Pagada' },
            { fecha: '2023-12-10', concepto: 'Kit de Sellos Hidráulicos', monto: 2100.00, estado: 'Pagada' },
        ]
    },
    {
        id: 'S6',
        nombre: 'Seguridad Privada Centinela',
        giro: 'Servicios de Vigilancia',
        categoria: 'Gasto Recurrente',
        gastoHistorico: 18000.00,
        ordenPromedio: 1500.00,
        tendenciaAnual: [40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40],
        insightIA: 'Servicio estable. Se recomienda auditar los reportes de incidentes para validar la efectividad del costo invertido en seguridad.',
        historialOrdenes: [
            { fecha: '2024-05-01', concepto: 'Servicio de Seguridad - Mayo', monto: 1500.00, estado: 'Pagada' },
        ]
    },
    {
        id: 'S7',
        nombre: 'Oficina y Papel San Andrés',
        giro: 'Artículos de Oficina',
        categoria: 'Gasto Recurrente',
        gastoHistorico: 3200.00,
        ordenPromedio: 260.00,
        tendenciaAnual: [30, 35, 40, 25, 20, 30, 35, 45, 50, 40, 35, 30],
        insightIA: 'Gasto hormiga detectado en suministros. Consolidar pedidos trimestrales podría ahorrarle un 10% en logística de entrega.',
        historialOrdenes: [
            { fecha: '2024-04-12', concepto: 'Papelería y Toners', monto: 450.00, estado: 'Pagada' },
        ]
    },
    {
        id: 'S8',
        nombre: 'Sistemas y Redes Globales',
        giro: 'Servicios de IT',
        categoria: 'Socio Estratégico',
        gastoHistorico: 15800.00,
        ordenPromedio: 1300.00,
        tendenciaAnual: [50, 55, 60, 65, 70, 60, 50, 45, 40, 55, 65, 75],
        insightIA: 'Crítico para la digitalización de su empresa. La suscripción de la nube ha subido por mayor uso de almacenamiento.',
        historialOrdenes: [
            { fecha: '2024-05-05', concepto: 'Mantenimiento Servidores', monto: 1200.00, estado: 'Vencida' },
        ]
    },
    {
        id: 'S9',
        nombre: 'Publicidad Impacto Digital',
        giro: 'Marketing y Publicidad',
        categoria: 'Eventual',
        gastoHistorico: 9500.00,
        ordenPromedio: 2300.00,
        tendenciaAnual: [0, 80, 0, 0, 90, 0, 0, 100, 0, 0, 0, 50],
        insightIA: 'Gasto ligado a campañas específicas. El retorno de inversión de la última campaña fue positivo según sus ventas del mes pasado.',
        historialOrdenes: [
            { fecha: '2024-02-10', concepto: 'Campaña Redes Sociales', monto: 2500.00, estado: 'Pagada' },
        ]
    },
    {
        id: 'S10',
        nombre: 'Agua Cristalina del Valle',
        giro: 'Suministro de Agua',
        categoria: 'Gasto Recurrente',
        gastoHistorico: 1450.00,
        ordenPromedio: 120.00,
        tendenciaAnual: [30, 32, 35, 40, 45, 50, 55, 50, 45, 40, 35, 30],
        insightIA: 'Gasto menor pero constante. No se detectan anomalías en el consumo de este proveedor.',
        historialOrdenes: [
            { fecha: '2024-05-02', concepto: 'Garrafones de Agua Mayo', monto: 135.00, estado: 'Pagada' },
        ]
    },
    {
        id: 'S11',
        nombre: 'Limpieza y Desinfección Pro',
        giro: 'Servicios de Limpieza',
        categoria: 'Gasto Recurrente',
        gastoHistorico: 5600.00,
        ordenPromedio: 800.00,
        tendenciaAnual: [40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40],
        insightIA: 'Costo estable. Se recomienda revisar el inventario de químicos para evitar compras duplicadas por el personal.',
        historialOrdenes: [
            { fecha: '2024-05-01', concepto: 'Servicio Limpieza Planta', monto: 800.00, estado: 'Pagada' },
        ]
    },
    {
        id: 'S12',
        nombre: 'Contratista de Obras Civiles',
        giro: 'Construcción',
        categoria: 'Eventual',
        gastoHistorico: 35000.00,
        ordenPromedio: 17500.00,
        tendenciaAnual: [0, 0, 0, 0, 0, 0, 100, 100, 0, 0, 0, 0],
        insightIA: 'Gasto extraordinario por remodelación de oficinas. No es un gasto proyectado para el próximo año fiscal.',
        historialOrdenes: [
            { fecha: '2023-08-15', concepto: 'Ampliación Oficina Ventas', monto: 17500.00, estado: 'Pagada' },
            { fecha: '2023-07-10', concepto: 'Anticipo Remodelación', monto: 17500.00, estado: 'Pagada' },
        ]
    }
];
