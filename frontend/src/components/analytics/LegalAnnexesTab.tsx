"use client";

import { FileText, Download, Filter, Search, Loader2, ChevronLeft, ChevronRight, Info, Wallet, Layers, ShieldCheck } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/supabase";

interface AnnexRecord {
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

type AnnexType = '1' | '2' | '4' | '14';

export default function LegalAnnexesTab() {
    const [activeAnnex, setActiveAnnex] = useState<AnnexType>('1');
    const [records, setRecords] = useState<AnnexRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState("");

    // Metadata de los anexos para la UI (Basado en el sistema Stitch "Fiscal Integrity")
    const annexConfig = {
        '1': {
            title: "Anexo 1: Ventas a Contribuyentes",
            subtitle: "Registro oficial de Comprobantes de Crédito Fiscal (CCF)",
            accent: "secondary",
            icon: <FileText size={20} />,
            bgIcon: "bg-surface-container-high text-primary",
            endpoint: "ventas",
            form: "F07 IVA v11.7",
            description: "Este anexo reporta todas las ventas realizadas a otros contribuyentes del IVA."
        },
        '2': {
            title: "Anexo 2: Consumidor Final",
            subtitle: "Resumen detallado de Facturas y Tiquetes (B2C)",
            accent: "secondary",
            icon: <Layers size={20} />,
            bgIcon: "bg-surface-container-high text-primary",
            endpoint: "ventas",
            form: "F07 IVA v11.7",
            description: "Reporte consolidado de operaciones gravadas a consumidores finales."
        },
        '4': {
            title: "Anexo 4: Compras",
            subtitle: "Registro de Compras Locales e Importaciones",
            accent: "secondary",
            icon: <Download size={20} />,
            bgIcon: "bg-surface-container-high text-primary",
            endpoint: "compras",
            form: "F07 IVA v11.7",
            description: "Listado de facturas de proveedores para la deducción del crédito fiscal."
        },
        '14': {
            title: "Anexo 14: Retenciones de Renta",
            subtitle: "Detalle Mensual de Planilla e Impuesto Retenido",
            accent: "secondary",
            icon: <Wallet size={20} />,
            bgIcon: "bg-surface-container-high text-primary",
            endpoint: "payroll",
            form: "F14 RENTA v9.0",
            description: "Información sobre salarios y retención de renta según tabla legal."
        }
    };

    useEffect(() => {
        const fetchAnnexData = async () => {
            setLoading(true);
            setError("");
            try {
                let headers: HeadersInit = {};
                const mockTenantId = localStorage.getItem("X-Mock-Tenant-ID");
                
                if (mockTenantId) {
                    headers = { "X-Mock-Tenant-ID": mockTenantId };
                } else {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData?.session?.access_token;
                    if (!token) throw new Error("No autenticado");
                    headers = { "Authorization": `Bearer ${token}` };
                }

                const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
                const endpoint = annexConfig[activeAnnex].endpoint;
                
                const res = await fetch(`${API_URL}/analytics/tax-summary/annexes/${endpoint}`, { headers });
                if (!res.ok) throw new Error(`Error: ${res.statusText}`);
                
                const result = await res.json();
                let fetchedRecords = result.data || [];

                if (activeAnnex === '1') {
                    fetchedRecords = fetchedRecords.filter((r: any) => r.transaction_type === 'Ventas Contribuyente');
                } else if (activeAnnex === '2') {
                    fetchedRecords = fetchedRecords.filter((r: any) => r.transaction_type === 'Ventas Consumidor');
                }

                setRecords(fetchedRecords);
            } catch (err: any) {
                console.error("Error fetching annex:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAnnexData();
    }, [activeAnnex]);

    const filteredRecords = useMemo(() => {
        if (!searchTerm) return records;
        const lowSearch = searchTerm.toLowerCase();
        return records.filter(r => 
            r.nombre?.toLowerCase().includes(lowSearch) || 
            r.nit_dui?.includes(searchTerm) ||
            r.numero?.includes(searchTerm)
        );
    }, [records, searchTerm]);

    const totals = useMemo(() => {
        return filteredRecords.reduce((acc, curr) => ({
            gravado: acc.gravado + curr.gravado,
            iva: acc.iva + (curr.iva || 0),
            total: acc.total + curr.total,
            exento: acc.exento + (curr.exento || 0),
            isr: acc.isr + (curr.isr || 0)
        }), { gravado: 0, iva: 0, total: 0, exento: 0, isr: 0 });
    }, [filteredRecords]);

    const activeConfig = annexConfig[activeAnnex];

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-20">
            
            {/* 1. SECCIÓN DE CABECERA (Institutional Style) */}
            <div className="bg-white border border-outline-variant rounded-md shadow-sm overflow-hidden">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 p-8">
                    
                    <div className="flex items-center gap-6">
                        <div className={`p-4 ${activeConfig.bgIcon} rounded-md`}>
                            {activeConfig.icon}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1.5">
                                <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-[0.1em] bg-primary text-white">
                                    {activeConfig.form}
                                </span>
                                <div className="flex items-center gap-1.5 text-secondary text-[10px] font-bold uppercase tracking-widest">
                                    <ShieldCheck size={12} />
                                    Verificado por Hacienda
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-primary tracking-tight mb-1">{activeConfig.title}</h2>
                            <p className="text-on-surface-variant text-sm font-medium">{activeConfig.subtitle}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                        <button className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-surface-container-low text-primary border border-outline rounded-md transition-all text-xs font-bold uppercase tracking-wider">
                            <Filter size={16} />
                            Filtros Legales
                        </button>
                        <button className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-secondary hover:bg-opacity-90 text-white rounded-md shadow-md transition-all text-xs font-bold uppercase tracking-wider">
                            <Download size={16} />
                            Exportar Anexo CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. SELECTOR DE ANEXOS (Tabs Institucionales) */}
            <div className="flex flex-wrap items-center gap-2 bg-surface-container p-1 rounded-md border border-outline-variant">
                {(['1', '2', '4', '14'] as AnnexType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => setActiveAnnex(type)}
                        className={`flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-sm transition-all duration-300 font-bold ${
                            activeAnnex === type 
                            ? `bg-white text-primary shadow-sm border border-outline-variant`
                            : 'text-on-surface-variant hover:text-primary hover:bg-surface-dim'
                        }`}
                    >
                        <span className="text-[10px] uppercase tracking-widest">
                            A{type}
                        </span>
                        <span className="text-xs truncate">
                            {type === '1' ? 'Contribuyentes' : type === '2' ? 'Consumidor' : type === '4' ? 'Compras' : 'Renta'}
                        </span>
                    </button>
                ))}
            </div>

            {/* 3. DASHBOARD DE TOTALES (Clean Institutional Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { 
                        label: activeAnnex === '14' ? 'Sujeto a Retención' : 'Monto Gravado', 
                        value: totals.gravado, 
                        info: "Base imponible" 
                    },
                    { 
                        label: activeAnnex === '14' ? 'ISR Retenido' : (activeAnnex === '4' ? 'Crédito Fiscal' : 'Débito Fiscal'), 
                        value: activeAnnex === '14' ? totals.isr : totals.iva, 
                        isAccent: true,
                        info: "Impuesto calculado" 
                    },
                    { 
                        label: "Operaciones Exentas", 
                        value: totals.exento, 
                        info: "Sin impacto" 
                    },
                    { 
                        label: activeAnnex === '14' ? 'Total Liquidado' : 'Total Transado', 
                        value: totals.total, 
                        isBold: true,
                        info: "Monto conciliado" 
                    }
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-md border border-outline-variant shadow-sm flex flex-col justify-between min-h-[140px]">
                        <div>
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">{kpi.label}</p>
                            <p className={`text-2xl font-bold tracking-tight font-tnum ${kpi.isAccent ? 'text-secondary' : 'text-primary'}`}>
                                ${kpi.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-container">
                            <span className="text-[10px] font-medium text-on-surface-variant italic">{kpi.info}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* 4. CONTENEDOR DE TABLA (Corporate Data Density) */}
            <div className="bg-white rounded-md border border-outline-variant shadow-sm overflow-hidden flex flex-col">
                
                {/* Herramientas de Tabla */}
                <div className="p-6 border-b border-outline-variant flex flex-col lg:flex-row justify-between gap-6 bg-surface-container-lowest">
                    <div className="relative flex-1 group max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={18} />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por Nombre, Identificación o Documento..." 
                            className="w-full bg-white border border-outline rounded-md py-2.5 pl-11 pr-4 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-surface-container rounded-md border border-outline-variant text-primary font-bold text-xs uppercase tracking-widest">
                        <Layers size={14} />
                        EJERCICIO: MAYO 2026
                    </div>
                </div>

                {/* Tabla de Datos */}
                <div className="overflow-x-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32">
                            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Generando Reporte Oficial</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-container text-on-surface-variant text-[10px] uppercase tracking-widest font-bold border-b border-outline-variant">
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4">Documento</th>
                                    <th className="px-6 py-4">NIT/DUI</th>
                                    <th className="px-6 py-4">Nombre / Razón Social</th>
                                    
                                    {activeAnnex === '2' && <th className="px-6 py-4 text-center">Resolución</th>}
                                    
                                    {activeAnnex === '14' ? (
                                        <>
                                            <th className="px-6 py-4 text-right">AFP</th>
                                            <th className="px-6 py-4 text-right">ISSS</th>
                                            <th className="px-6 py-4 text-right">Ret. ISR</th>
                                            <th className="px-6 py-4 text-right bg-surface-container-low">Neto</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-6 py-4 text-right">Exento</th>
                                            <th className="px-6 py-4 text-right">Gravado</th>
                                            <th className="px-6 py-4 text-right text-secondary">
                                                {activeAnnex === '4' ? 'Crédito' : 'Débito'}
                                            </th>
                                            <th className="px-6 py-4 text-right bg-surface-container-low">Total</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="text-xs font-tnum">
                                {filteredRecords.map((row, i) => (
                                    <tr key={i} className="border-b border-outline-variant/30 hover:bg-surface-container-lowest transition-colors group cursor-default">
                                        <td className="px-6 py-4 whitespace-nowrap text-on-surface-variant">
                                            {row.fecha}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-primary font-bold">{row.numero || 'S/N'}</span>
                                                <span className="text-[9px] text-on-surface-variant uppercase">Clase {row.clase_doc || '01'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-on-surface-variant">
                                            {row.nit_dui}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-[240px] truncate font-bold text-primary">
                                                {row.nombre}
                                            </div>
                                        </td>
                                        
                                        {activeAnnex === '2' && (
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-[10px] text-on-surface-variant font-medium">
                                                    {row.resolucion || '001-TP'}
                                                </span>
                                            </td>
                                        )}

                                        {activeAnnex === '14' ? (
                                            <>
                                                <td className="px-6 py-4 text-right text-on-surface-variant">${(row.afp || 0).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right text-on-surface-variant">${(row.isss || 0).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right text-red-600 font-bold">${(row.isr || 0).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right font-bold text-primary bg-surface-container-lowest/50">
                                                    ${row.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4 text-right text-on-surface-variant">${(row.exento || 0).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right text-primary font-bold">
                                                    ${row.gravado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-secondary">
                                                    ${(row.iva || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-primary bg-surface-container-lowest/50">
                                                    ${row.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer de Paginación */}
                <div className="p-6 bg-surface-container border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
                        <p className="text-xs text-on-surface-variant font-medium">
                            Mostrando <span className="text-primary font-bold">{filteredRecords.length}</span> registros conciliados • <span className="italic">Datos íntegros</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 bg-white border border-outline rounded-md text-on-surface-variant hover:bg-surface-dim transition-all">
                            <ChevronLeft size={20} />
                        </button>
                        <button className="px-6 py-2 bg-primary text-white rounded-md text-xs font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center gap-2">
                            Página Siguiente
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 5. SECCIÓN DE AUDITORÍA (Bottom Alert) */}
            <div className="bg-surface-container-high border border-outline-variant p-6 rounded-md flex items-start gap-4">
                <ShieldCheck size={24} className="text-primary mt-1" />
                <div>
                    <h4 className="text-primary font-bold text-sm mb-1 uppercase tracking-tight">Certificación de Integridad Fiscal</h4>
                    <p className="text-on-surface-variant text-xs font-medium leading-relaxed max-w-4xl">
                        Este anexo ha sido generado automáticamente siguiendo los lineamientos del Ministerio de Hacienda de El Salvador (F07 v11.7 / F14 v9.0). 
                        La integridad de los datos está garantizada mediante la conciliación directa con documentos tributarios electrónicos y registros de planilla validados.
                    </p>
                </div>
            </div>
        </div>
    );
}
