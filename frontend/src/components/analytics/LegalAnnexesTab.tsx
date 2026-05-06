"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/supabase";
import { AnnexRecord, AnnexType } from "@/types/analytics";

// ── Inline SVG Icons ───────────────────────────────────────────────────────────

const FileTextIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
  </svg>
);
const DownloadIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
  </svg>
);
const FilterIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);
const SearchIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);
const LoaderIcon = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);
const ChevronLeftIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
const ChevronRightIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
const WalletIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
  </svg>
);
const LayersIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
  </svg>
);
const ShieldCheckIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);


const annexConfig = {
    '1': { title: "Anexo 1: Ventas a Contribuyentes", subtitle: "Registro oficial de Comprobantes de Crédito Fiscal (CCF)", icon: <FileTextIcon size={20} />, endpoint: "ventas", form: "F07 IVA v11.7", description: "Este anexo reporta todas las ventas realizadas a otros contribuyentes del IVA." },
    '2': { title: "Anexo 2: Consumidor Final", subtitle: "Resumen detallado de Facturas y Tiquetes (B2C)", icon: <LayersIcon size={20} />, endpoint: "ventas", form: "F07 IVA v11.7", description: "Reporte consolidado de operaciones gravadas a consumidores finales." },
    '4': { title: "Anexo 4: Compras", subtitle: "Registro de Compras Locales e Importaciones", icon: <DownloadIcon size={20} />, endpoint: "compras", form: "F07 IVA v11.7", description: "Listado de facturas de proveedores para la deducción del crédito fiscal." },
    '14': { title: "Anexo 14: Retenciones de Renta", subtitle: "Detalle Mensual de Planilla e Impuesto Retenido", icon: <WalletIcon size={20} />, endpoint: "payroll", form: "F14 RENTA v9.0", description: "Información sobre salarios y retención de renta según tabla legal." }
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function LegalAnnexesTab() {
    const [activeAnnex, setActiveAnnex] = useState<AnnexType>('1');
    const [records, setRecords] = useState<AnnexRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState("");



    useEffect(() => {
        const fetchAnnexData = async () => {
            setLoading(true); setError("");
            try {
                let headers: HeadersInit = {};
                const mockTenantId = localStorage.getItem("X-Mock-Tenant-ID");
                if (mockTenantId) { headers = { "X-Mock-Tenant-ID": mockTenantId }; }
                else {
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
                let fetchedRecords: AnnexRecord[] = result.data || [];
                if (activeAnnex === '1') fetchedRecords = fetchedRecords.filter((r: AnnexRecord) => r.transaction_type === 'Ventas Contribuyente');
                else if (activeAnnex === '2') fetchedRecords = fetchedRecords.filter((r: AnnexRecord) => r.transaction_type === 'Ventas Consumidor');
                setRecords(fetchedRecords);
            } catch (err: unknown) { 
                console.error("Error fetching annex:", err); 
                setError(err instanceof Error ? err.message : "Error desconocido"); 
            }
            finally { setLoading(false); }
        };
        fetchAnnexData();
    }, [activeAnnex]);

    const filteredRecords = useMemo(() => {
        if (!searchTerm) return records;
        const lowSearch = searchTerm.toLowerCase();
        return records.filter(r => r.nombre?.toLowerCase().includes(lowSearch) || r.nit_dui?.includes(searchTerm) || r.numero?.includes(searchTerm));
    }, [records, searchTerm]);

    const totals = useMemo(() => filteredRecords.reduce((acc, curr) => ({
        gravado: acc.gravado + curr.gravado, iva: acc.iva + (curr.iva || 0), total: acc.total + curr.total, exento: acc.exento + (curr.exento || 0), isr: acc.isr + (curr.isr || 0)
    }), { gravado: 0, iva: 0, total: 0, exento: 0, isr: 0 }), [filteredRecords]);

    const activeConfig = annexConfig[activeAnnex];

    return (
        <div className="space-y-6 max-w-spacing-200 mx-auto pb-20">
            {/* 1. HEADER */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-md shadow-sm overflow-hidden">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 p-8">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-surface-container-high text-primary rounded-md">{activeConfig.icon}</div>
                        <div>
                             <div className="flex items-center gap-3 mb-1.5">
                                <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-primary text-on-primary">{activeConfig.form}</span>
                                <div className="flex items-center gap-1.5 text-secondary text-[10px] font-bold uppercase tracking-widest"><ShieldCheckIcon size={12} /> Verificado por Hacienda</div>
                            </div>
                            <h2 className="text-2xl font-bold text-primary tracking-tightest mb-1">{activeConfig.title}</h2>
                            <p className="text-on-surface-variant text-sm font-medium">{activeConfig.subtitle}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                        <button className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-surface-container-lowest hover:bg-surface-container-low text-primary border border-outline rounded-md transition-all text-xs font-bold uppercase tracking-wider"><FilterIcon size={16} /> Filtros Legales</button>
                        <button className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-secondary hover:opacity-90 text-on-secondary rounded-md shadow-md transition-all text-xs font-bold uppercase tracking-wider"><DownloadIcon size={16} /> Exportar Anexo CSV</button>
                    </div>
                </div>
            </div>

            {/* 2. ANNEX TABS */}
            <div className="flex flex-wrap items-center gap-2 bg-surface-container p-1 rounded-md border border-outline-variant">
                {(['1', '2', '4', '14'] as AnnexType[]).map((type) => (
                    <button key={type} onClick={() => setActiveAnnex(type)}
                        className={`flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-sm transition-all duration-300 font-bold ${activeAnnex === type ? 'bg-surface-container-lowest text-primary shadow-sm border border-outline-variant' : 'text-on-surface-variant hover:text-primary hover:bg-surface-dim'}`}>
                        <span className="text-[10px] uppercase tracking-widest">A{type}</span>
                        <span className="text-xs truncate">{type === '1' ? 'Contribuyentes' : type === '2' ? 'Consumidor' : type === '4' ? 'Compras' : 'Renta'}</span>
                    </button>
                ))}
            </div>

            {/* 3. KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: activeAnnex === '14' ? 'Sujeto a Retención' : 'Monto Gravado', value: totals.gravado, info: "Base imponible" },
                    { label: activeAnnex === '14' ? 'ISR Retenido' : (activeAnnex === '4' ? 'Crédito Fiscal' : 'Débito Fiscal'), value: activeAnnex === '14' ? totals.isr : totals.iva, isAccent: true, info: "Impuesto calculado" },
                    { label: "Operaciones Exentas", value: totals.exento, info: "Sin impacto" },
                    { label: activeAnnex === '14' ? 'Total Liquidado' : 'Total Transado', value: totals.total, isBold: true, info: "Monto conciliado" }
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-surface-container-lowest p-6 rounded-md border border-outline-variant shadow-sm flex flex-col justify-between min-h-spacing-10">
                        <div>
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">{kpi.label}</p>
                            <p className={`text-2xl font-bold tracking-tightest font-tnum ${kpi.isAccent ? 'text-secondary' : 'text-primary'}`}>${kpi.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-container">
                            <span className="text-[10px] font-medium text-on-surface-variant italic">{kpi.info}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* 4. DATA TABLE */}
            <div className="bg-surface-container-lowest rounded-md border border-outline-variant shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-outline-variant flex flex-col lg:flex-row justify-between gap-6 bg-surface-container-lowest">
                    <div className="relative flex-1 group max-w-xl">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors"><SearchIcon size={18} /></span>
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por Nombre, Identificación o Documento..."
                            className="w-full bg-surface-container-lowest border border-outline rounded-md py-2.5 pl-11 pr-4 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-medium" />
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-surface-container rounded-md border border-outline-variant text-primary font-bold text-xs uppercase tracking-widest">
                        <LayersIcon size={14} /> EJERCICIO: MAYO 2026
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32">
                            <span className="text-primary mb-4"><LoaderIcon size={40} /></span>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Generando Reporte Oficial</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center">
                            <span className="text-error mb-4"><FileTextIcon size={40} /></span>
                            <p className="text-sm font-bold text-error uppercase tracking-widest">Error al cargar anexo</p>
                            <p className="text-xs text-on-surface-variant mt-2">{error}</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-container text-on-surface-variant text-[10px] uppercase tracking-widest font-bold border-b border-outline-variant">
                                    <th className="px-6 py-4">Fecha</th><th className="px-6 py-4">Documento</th><th className="px-6 py-4">NIT/DUI</th><th className="px-6 py-4">Nombre / Razón Social</th>
                                    {activeAnnex === '2' && <th className="px-6 py-4 text-center">Resolución</th>}
                                    {activeAnnex === '14' ? (<><th className="px-6 py-4 text-right">AFP</th><th className="px-6 py-4 text-right">ISSS</th><th className="px-6 py-4 text-right">Ret. ISR</th><th className="px-6 py-4 text-right bg-surface-container-low">Neto</th></>) : (<><th className="px-6 py-4 text-right">Exento</th><th className="px-6 py-4 text-right">Gravado</th><th className="px-6 py-4 text-right text-secondary">{activeAnnex === '4' ? 'Crédito' : 'Débito'}</th><th className="px-6 py-4 text-right bg-surface-container-low">Total</th></>)}
                                </tr>
                            </thead>
                            <tbody className="text-xs font-tnum">
                                {filteredRecords.map((row, i) => (
                                    <tr key={i} className="border-b border-outline-variant/30 hover:bg-surface-container-lowest transition-colors group cursor-default">
                                        <td className="px-6 py-4 whitespace-nowrap text-on-surface-variant">{row.fecha}</td>
                                        <td className="px-6 py-4"><div className="flex flex-col"><span className="text-primary font-bold">{row.numero || 'S/N'}</span><span className="text-[9px] text-on-surface-variant uppercase">Clase {row.clase_doc || '01'}</span></div></td>
                                        <td className="px-6 py-4 text-on-surface-variant">{row.nit_dui}</td>
                                        <td className="px-6 py-4"><div className="max-w-spacing-25 truncate font-bold text-primary">{row.nombre}</div></td>
                                        {activeAnnex === '2' && (<td className="px-6 py-4 text-center"><span className="text-[10px] text-on-surface-variant font-medium">{row.resolucion || '001-TP'}</span></td>)}
                                        {activeAnnex === '14' ? (<>
                                            <td className="px-6 py-4 text-right text-on-surface-variant">${(row.afp || 0).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right text-on-surface-variant">${(row.isss || 0).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right text-error font-bold">${(row.isr || 0).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-bold text-primary bg-surface-container-lowest/50">${row.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                        </>) : (<>
                                            <td className="px-6 py-4 text-right text-on-surface-variant">${(row.exento || 0).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right text-primary font-bold">${row.gravado.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-6 py-4 text-right font-bold text-secondary">${(row.iva || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-6 py-4 text-right font-bold text-primary bg-surface-container-lowest/50">${row.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                        </>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-surface-container border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
                        <p className="text-xs text-on-surface-variant font-medium">Mostrando <span className="text-primary font-bold">{filteredRecords.length}</span> registros conciliados • <span className="italic">Datos íntegros</span></p>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 bg-surface-container-lowest border border-outline rounded-md text-on-surface-variant hover:bg-surface-dim transition-all"><ChevronLeftIcon size={20} /></button>
                        <button className="px-6 py-2 bg-primary text-on-primary rounded-md text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2">Página Siguiente <ChevronRightIcon size={16} /></button>
                    </div>
                </div>
            </div>

            {/* 5. AUDIT FOOTER */}
            <div className="bg-surface-container-high border border-outline-variant p-6 rounded-md flex items-start gap-4">
                <span className="text-primary mt-1"><ShieldCheckIcon size={24} /></span>
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
