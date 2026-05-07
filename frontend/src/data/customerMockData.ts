import { CustomerRecord } from '../types/customerAnalysis';

export const customerMockData: CustomerRecord[] = [
    {
        id: '1',
        nombre: 'Supermercados La Canasta S.A. de C.V.',
        giro: 'Venta al por mayor de alimentos',
        estado: 'Campeones',
        gananciaHistorica: 125400.50,
        ticketPromedio: 4200.00,
        tendenciaAnual: [65, 70, 85, 90, 80, 75, 88, 95, 100, 92, 85, 98],
        insightIA: 'Este cliente es su mayor aliado. Ha mostrado un crecimiento del 15% este trimestre. Recomendamos ofrecerle un descuento por pronto pago para asegurar liquidez.',
        historialFacturas: [
            { fecha: '2024-05-01', concepto: 'Suministro Mensual Mayo', monto: 4500.00, estado: 'Pagada' },
            { fecha: '2024-04-02', concepto: 'Suministro Mensual Abril', monto: 4100.00, estado: 'Pagada' },
            { fecha: '2024-03-05', concepto: 'Pedido Extraordinario', monto: 1200.00, estado: 'Pagada' },
        ]
    },
    {
        id: '2',
        nombre: 'Ferretería El Tornillo Feliz',
        giro: 'Materiales de construcción',
        estado: 'Leales',
        gananciaHistorica: 45200.00,
        ticketPromedio: 1280.00,
        tendenciaAnual: [40, 45, 42, 50, 48, 44, 46, 52, 49, 47, 51, 53],
        insightIA: 'Cliente estable con compras recurrentes. Su ticket promedio ha subido ligeramente. Mantenga la comunicación constante.',
        historialFacturas: [
            { fecha: '2024-04-15', concepto: 'Herramientas Industriales', monto: 1280.00, estado: 'Pagada' },
            { fecha: '2024-03-10', concepto: 'Material Eléctrico', monto: 950.00, estado: 'Pagada' },
        ]
    },
    {
        id: '3',
        nombre: 'Restaurante Sabor Cuscatleco',
        giro: 'Servicios de alimentación',
        estado: 'En Riesgo',
        gananciaHistorica: 12000.75,
        ticketPromedio: 450.00,
        tendenciaAnual: [80, 75, 60, 50, 40, 30, 20, 15, 10, 5, 0, 0],
        insightIA: 'Este cliente es muy valioso pero no ha comprado en 2 meses. Sugerimos contactarlo hoy mismo para entender si hay algún problema con el servicio.',
        historialFacturas: [
            { fecha: '2024-02-20', concepto: 'Insumos Cocina', monto: 450.00, estado: 'Pagada' },
            { fecha: '2024-01-15', concepto: 'Insumos Cocina', monto: 480.00, estado: 'Pagada' },
            { fecha: '2023-12-10', concepto: 'Cena Navideña Corporativa', monto: 2500.00, estado: 'Vencida' },
        ]
    },
    {
        id: '4',
        nombre: 'Farmacia Vida Sana',
        giro: 'Venta de productos farmacéuticos',
        estado: 'Leales',
        gananciaHistorica: 68900.00,
        ticketPromedio: 2100.00,
        tendenciaAnual: [60, 62, 65, 58, 60, 63, 67, 70, 68, 65, 66, 69],
        insightIA: 'Mantiene un ritmo de compra muy predecible. Buen momento para introducir una nueva línea de productos de cuidado personal.',
        historialFacturas: [
            { fecha: '2024-05-03', concepto: 'Lote Medicamentos A-Z', monto: 2100.00, estado: 'Pendiente' },
            { fecha: '2024-04-05', concepto: 'Lote Medicamentos A-Z', monto: 2050.00, estado: 'Pagada' },
        ]
    },
    {
        id: '5',
        nombre: 'Textiles del Pacífico',
        giro: 'Fabricación de prendas de vestir',
        estado: 'Campeones',
        gananciaHistorica: 210000.00,
        ticketPromedio: 15000.00,
        tendenciaAnual: [90, 85, 95, 100, 98, 92, 88, 94, 96, 99, 97, 95],
        insightIA: 'Cliente estratégico de alto volumen. Su facturación representa el 20% de sus ingresos totales. Prioridad máxima en atención.',
        historialFacturas: [
            { fecha: '2024-04-28', concepto: 'Materia Prima Tela Algodón', monto: 15000.00, estado: 'Pagada' },
            { fecha: '2024-03-25', concepto: 'Materia Prima Tela Lino', monto: 14500.00, estado: 'Pagada' },
        ]
    },
    {
        id: '6',
        nombre: 'Talleres Mecánicos Unidos',
        giro: 'Mantenimiento automotriz',
        estado: 'En Riesgo',
        gananciaHistorica: 8500.00,
        ticketPromedio: 320.00,
        tendenciaAnual: [30, 35, 40, 38, 35, 30, 25, 20, 15, 12, 10, 8],
        insightIA: 'La frecuencia de compra ha caído drásticamente. Es probable que estén probando un nuevo proveedor. Se recomienda una visita de fidelización.',
        historialFacturas: [
            { fecha: '2024-03-01', concepto: 'Repuestos Varios', monto: 320.00, estado: 'Pagada' },
            { fecha: '2024-01-15', concepto: 'Aceites y Lubricantes', monto: 280.00, estado: 'Pagada' },
        ]
    },
    {
        id: '7',
        nombre: 'Librería El Saber',
        giro: 'Artículos de oficina y papelería',
        estado: 'Leales',
        gananciaHistorica: 15600.00,
        ticketPromedio: 600.00,
        tendenciaAnual: [50, 80, 90, 50, 45, 40, 42, 48, 55, 60, 58, 52],
        insightIA: 'Picos estacionales detectados en temporada escolar (Enero-Marzo). Planifique inventario con antelación para el próximo ciclo.',
        historialFacturas: [
            { fecha: '2024-02-15', concepto: 'Útiles Escolares Lote 1', monto: 1200.00, estado: 'Pagada' },
            { fecha: '2024-01-10', concepto: 'Útiles Escolares Lote 2', monto: 1500.00, estado: 'Pagada' },
        ]
    },
    {
        id: '8',
        nombre: 'Panadería La Espiga',
        giro: 'Producción de pan y repostería',
        estado: 'Leales',
        gananciaHistorica: 5400.00,
        ticketPromedio: 150.00,
        tendenciaAnual: [30, 32, 35, 33, 31, 34, 36, 38, 37, 35, 34, 33],
        insightIA: 'Cliente pequeño pero constante. Su nivel de riesgo es bajo debido a la naturaleza de su negocio.',
        historialFacturas: [
            { fecha: '2024-05-02', concepto: 'Insumos Harina', monto: 150.00, estado: 'Pagada' },
        ]
    },
    {
        id: '9',
        nombre: 'Gimnasio Iron Body',
        giro: 'Servicios de fitness',
        estado: 'En Riesgo',
        gananciaHistorica: 4200.00,
        ticketPromedio: 350.00,
        tendenciaAnual: [60, 55, 45, 35, 25, 20, 15, 10, 5, 0, 0, 0],
        insightIA: 'Ha suspendido pagos este mes. Posible cierre de sucursal o cambio de administración.',
        historialFacturas: [
            { fecha: '2024-02-01', concepto: 'Mantenimiento Equipos', monto: 350.00, estado: 'Pagada' },
        ]
    },
    {
        id: '10',
        nombre: 'Consultoría Estratégica SV',
        giro: 'Asesoría empresarial',
        estado: 'Leales',
        gananciaHistorica: 2800.00,
        ticketPromedio: 700.00,
        tendenciaAnual: [20, 25, 30, 35, 40, 45, 50, 45, 40, 35, 30, 25],
        insightIA: 'Servicios recurrentes trimestrales. Sin incidencias reportadas.',
        historialFacturas: [
            { fecha: '2024-03-20', concepto: 'Asesoría Legal', monto: 700.00, estado: 'Pagada' },
        ]
    },
    {
        id: '11',
        nombre: 'Tienda de Mascotas Paws',
        giro: 'Venta de artículos para mascotas',
        estado: 'Campeones',
        gananciaHistorica: 3100.00,
        ticketPromedio: 120.00,
        tendenciaAnual: [10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100],
        insightIA: 'Crecimiento explosivo detectado. Nuevo cliente con potencial de escalar a cuenta VIP.',
        historialFacturas: [
            { fecha: '2024-05-05', concepto: 'Lote Alimentos Premium', monto: 120.00, estado: 'Pendiente' },
        ]
    },
    {
        id: '12',
        nombre: 'Cerrajería El Maestro',
        giro: 'Servicios de cerrajería industrial',
        estado: 'En Riesgo',
        gananciaHistorica: 1800.00,
        ticketPromedio: 45.00,
        tendenciaAnual: [40, 35, 30, 25, 20, 15, 10, 5, 0, 0, 0, 0],
        insightIA: 'Baja actividad transaccional. Se sugiere revisar la última interacción comercial.',
        historialFacturas: [
            { fecha: '2024-01-10', concepto: 'Repuestos Cerraduras', monto: 45.00, estado: 'Pagada' },
        ]
    }
];
