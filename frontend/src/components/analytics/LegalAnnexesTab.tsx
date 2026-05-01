"use client";

import { FileText, Download, Filter, Search, Loader2, ChevronLeft, ChevronRight, Info, Wallet } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/supabase";

interface AnnexRecord {
    fecha: string;
    tipo_doc?: string;
    numero?: string;
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
}

type AnnexType = '1' | '2' | '4' | '14';

export default function LegalAnnexesTab() {
    const [activeAnnex, setActiveAnnex] = useState<AnnexType>('1');
    const [records, setRecords] = useState<AnnexRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState("");

    // Metadata de los anexos para la UI
    const annexConfig = {
        '1': {
            title: "Anexo 1: Ventas a Contribuyentes",
            subtitle: "Reporte detallado de Crédito Fiscal y facturación B2B",
            accent: "emerald",
            icon: <FileText size={32} />,
            bgIcon: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            endpoint: "ventas",
            form: "F07 IVA"
        },
        '2': {
            title: "Anexo 2: Consumidor Final",
            subtitle: "Resumen diario de facturas y tickets (B2C)",
            accent: "amber",
            icon: <FileText size={32} />,
            bgIcon: "bg-amber-500/10 text-amber-400 border-amber-500/20",
            endpoint: "ventas",
            form: "F07 IVA"
        },
        '4': {
            title: "Anexo 4: Compras",
            subtitle: "Detalle de compras y créditos fiscales recibidos",
            accent: "cyan",
            icon: <FileText size={32} />,
            bgIcon: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
            endpoint: "compras",
            form: "F07 IVA"
        },
        '14': {
            title: "Anexo 14: Retenciones de Renta",
            subtitle: "Detalle de pagos de nómina y retenciones de ley",
            accent: "indigo",
            icon: <Wallet size={32} />,
            bgIcon: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
            endpoint: "payroll",
            form: "F14 RENTA"
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

                // Filtrar por tipo si es necesario
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Premium Estilo Stitch */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-64 h-64 bg-${activeConfig.accent}-500/5 blur-[80px] -mr-32 -mt-32 rounded-full group-hover:bg-${activeConfig.accent}-500/10 transition-colors duration-1000`}></div>
                
                <div className="flex items-center gap-6 relative z-10">
                    <div className={`p-4 ${activeConfig.bgIcon} rounded-2xl shadow-inner transition-transform group-hover:scale-110 duration-500`}>
                        {activeConfig.icon}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${activeConfig.bgIcon} border`}>
                                {activeConfig.form}
                            </span>
                            <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">• Auditoría Real-Time</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-100 tracking-tight">{activeConfig.title}</h2>
                        <p className="text-slate-500 text-sm font-medium">{activeConfig.subtitle}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full xl:w-auto relative z-10">
                    <button className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 rounded-2xl border border-slate-700/50 transition-all text-sm font-bold backdrop-blur-sm group/btn">
                        <Filter size={18} className="group-hover/btn:rotate-180 transition-transform duration-500" />
                        Filtros Avanzados
                    </button>
                    <button className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-${activeConfig.accent}-500 text-slate-950 hover:bg-${activeConfig.accent}-400 rounded-2xl shadow-lg shadow-${activeConfig.accent}-500/20 transition-all text-sm font-black hover:scale-[1.02] active:scale-95`}>
                        <Download size={18} />
                        Exportar Anexo
                    </button>
                </div>
            </div>

            {/* Sub-Navegación de Anexos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(['1', '2', '4', '14'] as AnnexType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => setActiveAnnex(type)}
                        className={`flex flex-col gap-1 p-4 rounded-3xl border transition-all duration-300 text-left ${
                            activeAnnex === type 
                            ? `bg-slate-800/80 border-${annexConfig[type].accent}-500/50 shadow-lg shadow-${annexConfig[type].accent}-500/5 ring-1 ring-${annexConfig[type].accent}-500/20`
                            : 'bg-slate-900/20 border-slate-800/50 hover:border-slate-700 text-slate-500 hover:bg-slate-900/40'
                        }`}
                    >
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${activeAnnex === type ? `text-${annexConfig[type].accent}-400` : 'text-slate-600'}`}>
                            Anexo {type}
                        </span>
                        <span className={`text-sm font-bold ${activeAnnex === type ? 'text-slate-100' : 'text-slate-400'}`}>
                            {type === '1' ? 'Contribuyentes' : type === '2' ? 'Consumidor Final' : type === '4' ? 'Compras' : 'Nómina / Renta'}
                        </span>
                    </button>
                ))}
            </div>

            {/* Resumen de Totales Flotante */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50 shadow-xl group">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{activeAnnex === '14' ? 'Sueldos Brutos' : 'Gravado Local'}</p>
                    <p className="text-2xl font-black text-slate-100">${totals.gravado.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <div className="mt-2 h-1 w-12 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full bg-${activeConfig.accent}-500 w-2/3`}></div>
                    </div>
                </div>
                <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50 shadow-xl">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{activeAnnex === '14' ? 'Retención ISR' : 'Débito/Crédito IVA'}</p>
                    <p className={`text-2xl font-black text-${activeConfig.accent}-400`}>${(activeAnnex === '14' ? totals.isr : totals.iva).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <div className="mt-2 h-1 w-12 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full bg-${activeConfig.accent}-400 w-1/2`}></div>
                    </div>
                </div>
                <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50 shadow-xl">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Operaciones Exentas</p>
                    <p className="text-2xl font-black text-slate-400">${totals.exento.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <div className="mt-2 h-1 w-12 bg-slate-800 rounded-full overflow-hidden"></div>
                </div>
                <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50 shadow-xl ring-2 ring-emerald-500/10">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{activeAnnex === '14' ? 'Sueldos Netos' : 'Total Transacciones'}</p>
                    <p className="text-2xl font-black text-slate-100">${totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-500/80">
                        <Info size={10} />
                        Calculado del periodo actual
                    </div>
                </div>
            </div>

            {/* Contenedor de Tabla Stitch-Design */}
            <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-slate-800/50 shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
                {/* Barra de Búsqueda y Herramientas */}
                <div className="p-8 border-b border-slate-800/50 flex flex-col lg:flex-row justify-between gap-6 bg-slate-950/20">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors" size={20} />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Filtrar por Nombre, Documento o Identificación..." 
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-6 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                        <span>Periodo:</span>
                        <span className="px-4 py-2 bg-slate-950/50 rounded-xl border border-slate-800 text-slate-200">
                            Mayo 2026
                        </span>
                    </div>
                </div>

                {/* Área de Tabla */}
                <div className="overflow-x-auto flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-80 text-slate-500">
                            <div className="relative w-16 h-16 mb-4">
                                <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-600">Sincronizando con Hacienda</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-80 p-8 text-center">
                            <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-400 mb-4">
                                <Info size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-200 mb-1">Error de Conexión</h3>
                            <p className="text-slate-500 text-sm max-w-xs">{error}</p>
                            <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all">Reintentar</button>
                        </div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-80 text-slate-500 grayscale opacity-50">
                            <FileText size={48} strokeWidth={1} className="mb-4" />
                            <p className="font-bold text-sm">Sin registros para mostrar</p>
                            <p className="text-xs">Asegúrese de haber cargado los archivos correspondientes.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950/40 text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-800/50">
                                    <th className="px-8 py-5">Fecha</th>
                                    <th className="px-8 py-5">{activeAnnex === '14' ? 'Referencia' : 'Documento'}</th>
                                    <th className="px-8 py-5">Identificación</th>
                                    <th className="px-8 py-5">Nombre / Razón Social</th>
                                    {activeAnnex === '2' && <th className="px-8 py-5">Máquina</th>}
                                    {activeAnnex === '14' ? (
                                        <>
                                            <th className="px-8 py-5 text-right">AFP</th>
                                            <th className="px-8 py-5 text-right">ISSS</th>
                                            <th className="px-8 py-5 text-right">ISR</th>
                                            <th className="px-8 py-5 text-right">Sueldo Neto</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-8 py-5 text-right">Exento</th>
                                            <th className="px-8 py-5 text-right">Gravado</th>
                                            <th className="px-8 py-5 text-right">IVA</th>
                                            <th className="px-8 py-5 text-right">Total</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="text-sm text-slate-300">
                                {filteredRecords.map((row, i) => (
                                    <tr key={i} className="border-b border-slate-800/30 hover:bg-slate-800/30 transition-all duration-300 group cursor-default">
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <span className="text-slate-400 font-mono text-xs bg-slate-950/30 px-2 py-1 rounded-md">{row.fecha}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-slate-200 font-bold tracking-tight">{row.numero || 'N/A'}</span>
                                                <span className="text-[10px] text-slate-600 font-black uppercase">{activeAnnex === '14' ? 'Planilla' : `Tipo ${row.tipo_doc || '03'}`}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 font-mono text-xs text-slate-500">{row.nit_dui}</td>
                                        <td className="px-8 py-5">
                                            <div className="max-w-xs truncate font-bold text-slate-300 group-hover:text-white transition-colors">
                                                {row.nombre}
                                            </div>
                                        </td>
                                        {activeAnnex === '2' && <td className="px-8 py-5 text-slate-600 font-mono text-xs">001</td>}
                                        
                                        {activeAnnex === '14' ? (
                                            <>
                                                <td className="px-8 py-5 text-right text-slate-500 font-mono text-xs">${(row.afp || 0).toFixed(2)}</td>
                                                <td className="px-8 py-5 text-right text-slate-500 font-mono text-xs">${(row.isss || 0).toFixed(2)}</td>
                                                <td className="px-8 py-5 text-right text-red-400/80 font-mono text-xs">${(row.isr || 0).toFixed(2)}</td>
                                                <td className="px-8 py-5 text-right font-black text-slate-100 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors shadow-inner">${row.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-8 py-5 text-right text-slate-500 font-mono text-xs">${(row.exento || 0).toFixed(2)}</td>
                                                <td className="px-8 py-5 text-right text-slate-300 font-semibold">${row.gravado.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                <td className={`px-8 py-5 text-right font-black text-${activeConfig.accent}-400/90`}>${(row.iva || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-8 py-5 text-right font-black text-slate-100 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors shadow-inner">${row.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                
                {/* Footer de Paginación Premium */}
                <div className="p-8 bg-slate-950/40 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full bg-${activeConfig.accent}-500 animate-pulse`}></div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                            Mostrando <span className="text-slate-200">{filteredRecords.length}</span> registros operativos
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button className="p-3 bg-slate-900/50 border border-slate-800 text-slate-600 rounded-xl text-xs font-bold cursor-not-allowed transition-all">
                            <ChevronLeft size={20} />
                        </button>
                        <button className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-2">
                            Página Siguiente
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
